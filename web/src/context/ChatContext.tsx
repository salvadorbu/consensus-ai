import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { ChatSession, AIModel } from '../types';
import type { MessageRole } from '../types/index';
import {
  listChats,
  createChat as apiCreateChat,
  getChat,
  deleteChat as apiDeleteChat,
  listMessages as apiListMessages,
  sendMessage as apiSendMessage,
  cancelRequest,
} from '../api/chats';
import { API_BASE, authHeaders } from '../api/config';

import { useConsensusSettings } from './ConsensusContext';
import { useProfiles } from './ProfilesContext';

// Define context interface
interface ChatContextType {
  chatSessions: ChatSession[];
  activeChatId: string | null;
  selectedModel: AIModel;
  availableModels: AIModel[];
  startNewChat: () => void;
  selectChat: (chatId: string) => void;
  deleteChat: (chatId: string) => void;
  sendMessage: (content: string, useConsensus?: boolean) => void;
  setSelectedModel: (model: AIModel) => void;
  loading: boolean;
  isAgentBusy: boolean;
  cancelGeneration: () => void;
}

// Helper: loading state for models
const ModelsNotLoadedFallback: AIModel = {
  id: '',
  name: 'Loading...',
  description: 'Loading models...'
};

// Create context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider component
export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [availableModels, setAvailableModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel>(ModelsNotLoadedFallback);
  const [loading, setLoading] = useState(false);
  const [isAgentBusy, setIsAgentBusy] = useState(false);
  const [busyChatId, setBusyChatId] = useState<string | null>(null);
  // Keep reference to current AbortController so we can cancel fetch stream
  const abortControllerRef = useRef<AbortController | null>(null);
  const { isAuthenticated } = useAuth();

  // Routing helpers
  const navigate = useNavigate();
  const location = useLocation();

  // Keep local activeChatId in sync with the URL
  useEffect(() => {
    if (location.pathname.startsWith('/chat/')) {
      const id = location.pathname.split('/')[2];
      if (id && id !== activeChatId) setActiveChatId(id);
    } else if (activeChatId) {
      setActiveChatId(null);
    }
  }, [location.pathname]);

  const { guidingModel, participantModels } = useConsensusSettings();
  const { selectedProfileId } = useProfiles();

  // Load available models from backend paginated endpoint
  useEffect(() => {
    (async () => {
      try {
        // Fetch first 100 models (adjust as needed)
        const resp = await (await import('../api/models')).listModels({ page: 1, limit: 100 });
        const data = resp.results;
        setAvailableModels(data);
        const defaultModel = data.find((m: AIModel) => m.id === 'anthropic/claude-3.7-sonnet') || data[0];
        if (defaultModel) setSelectedModel(defaultModel);
      } catch (err) {
        console.error('Failed to load models:', err);
        setAvailableModels([]);
      }
    })();
  }, []);

  // Fetch chats once authenticated
  useEffect(() => {
    const fetchChats = async () => {
      setLoading(true);
      try {
        const apiChats = await listChats();
        // Map API chats to ChatSession[] (empty messages initially)
        setChatSessions(apiChats.map(chat => ({
          id: chat.id,
          title: chat.name,
          messages: [],
          lastUpdated: new Date(chat.updated_at),
        })));
      } catch (err) {
        console.error('Failed to fetch chats:', err);
      } finally {
        setLoading(false);
      }
    };
    if (!isAuthenticated) {
      setChatSessions([]);
      return;
    }
    fetchChats();
  }, [isAuthenticated]);

  // When a chat is selected, fetch its messages
  // Track which chatIds have been fetched to avoid repeated fetching for empty chats
  const fetchedChatIdsRef = React.useRef<Set<string>>(new Set());

  useEffect(() => {
    const fetchChatMessages = async () => {
      if (!activeChatId) return;
      // Only fetch if we haven't fetched this chatId yet
      if (fetchedChatIdsRef.current.has(activeChatId)) return;
      // Find the active chat in local state
      const localActiveChat = chatSessions.find(chat => chat.id === activeChatId);
      // Only fetch and overwrite if there are no messages in local state
      if (localActiveChat && localActiveChat.messages && localActiveChat.messages.length > 0) {
        fetchedChatIdsRef.current.add(activeChatId); // Mark as fetched if already has messages
        return;
      }
      setLoading(true);
      try {
        const chatWithMessages = await getChat(activeChatId);
        setChatSessions(prev => {
          const existingChat = prev.find(chat => chat.id === activeChatId);
          const enrichedMessages = [
            ...chatWithMessages.messages.map(msg => ({
              role: msg.role as MessageRole,
              content: msg.content,
              timestamp: new Date(msg.created_at),
              model: msg.model,
              isConsensus: msg.model === 'consensus',
              channelId: (msg as any).channel?.id,
            })),
            ...chatWithMessages.channels
              .filter(c => c.answer)
              .filter(
                c =>
                  !chatWithMessages.messages.some(
                    m => m.model === 'consensus' && m.content === c.answer,
                  ),
              )
              .map(c => ({
                role: 'assistant' as MessageRole,
                content: c.answer as string,
                timestamp: new Date(c.finished_at ?? c.created_at),
                model: 'consensus',
                isConsensus: true,
                channelId: c.id,
              })),
          ];

          if (existingChat) {
            // Update existing chat
            return prev.map(chat =>
              chat.id === activeChatId
                ? {
                    ...chat,
                    messages: existingChat.messages && existingChat.messages.length > 0
                      ? existingChat.messages // keep optimistic messages if present
                      : enrichedMessages,
                    lastUpdated: new Date(chatWithMessages.updated_at),
                  }
                : chat,
            );
          }
          // Chat not in state yet (e.g., hard refresh on a deep link) – add it
          return [
            {
              id: chatWithMessages.id,
              title: chatWithMessages.name,
              messages: enrichedMessages,
              lastUpdated: new Date(chatWithMessages.updated_at),
            },
            ...prev,
          ];
        });
        // Mark as fetched only after we've successfully inserted/updated the chat
        fetchedChatIdsRef.current.add(activeChatId);
        // Set selected model to the model of the latest message, if any
        if (chatWithMessages.messages && chatWithMessages.messages.length > 0) {
          const latestMsg = chatWithMessages.messages[chatWithMessages.messages.length - 1];
          if (latestMsg.model && availableModels.length > 0) {
            const foundModel = availableModels.find(m => m.id === latestMsg.model);
            if (foundModel) setSelectedModel(foundModel);
          }
        }
      } catch (err) {
        console.error('Failed to fetch chat messages:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchChatMessages();
  }, [activeChatId, chatSessions]);

  // Reset fetched chatIds when chatSessions are reloaded (e.g., on logout/login)
  useEffect(() => {
    fetchedChatIdsRef.current.clear();
  }, [chatSessions.length]);

  // Start a new chat using the backend API
  const startNewChat = async () => {
    try {
      if (!selectedModel || !selectedModel.id) return; // Guard: don't run if not ready
      const created = await apiCreateChat({
        name: 'New Conversation',
        default_model: selectedModel.id,
      });
      const newChat: ChatSession = {
        id: created.id,
        title: created.name,
        messages: [],
        lastUpdated: new Date(created.created_at),
      };
      setChatSessions(prev => [newChat, ...prev]);
      setActiveChatId(created.id);
      navigate(`/chat/${created.id}`);
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  // Select a chat
  const selectChat = (chatId: string) => {
    if (chatId) {
      navigate(`/chat/${chatId}`);
      setActiveChatId(chatId);
    } else {
      navigate('/');
      setActiveChatId(null);
    }
  };

  // Delete a chat using the backend API
  const deleteChat = async (chatId: string) => {
    try {
      await apiDeleteChat(chatId);
      setChatSessions(prev => prev.filter(chat => chat.id !== chatId));
      // If active chat is deleted, set active to null or another chat
      if (activeChatId === chatId) {
        navigate('/');
        const remainingChats = chatSessions.filter(chat => chat.id !== chatId);
        setActiveChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  // Send a message using the backend API
  const sendMessage = async (content: string, useConsensus?: boolean) => {
    if (isAgentBusy) return; // Prevent sending if agent is busy
    setIsAgentBusy(true);
    setBusyChatId(activeChatId);
    let chatId = activeChatId;
    // If no active chat, create one first
    if (!selectedModel || !selectedModel.id) return;
    let userMsg = {
      role: 'user' as MessageRole,
      content,
      timestamp: new Date(),
      model: selectedModel.id,
    };
    if (!chatId) {
      try {
        const created = await apiCreateChat({
          name: 'New Conversation',
          default_model: selectedModel.id,
        });
        const newChat: ChatSession = {
          id: created.id,
          title: created.name,
          messages: [userMsg], // Add the optimistic message directly
          lastUpdated: new Date(created.created_at),
        };
        setChatSessions(prev => [newChat, ...prev]);
        setActiveChatId(created.id);
        chatId = created.id;
      } catch (err) {
        console.error('Failed to create chat:', err);
        return;
      }
    } else {
      // 1. Optimistically add the user's message for existing chats
      setChatSessions(prev =>
        prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, userMsg],
              lastUpdated: new Date(),
            };
          }
          return chat;
        })
      );
    }

    // If useConsensus flag is set, leverage unified chat endpoint
    if (useConsensus) {
      // Optimistically add placeholder assistant message
      const placeholderMsg = {
        role: 'assistant' as MessageRole,
        content: 'Running consensus...',
        timestamp: new Date(),
        model: 'consensus',
        isConsensus: true,
      };
      setChatSessions(prev =>
        prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, placeholderMsg],
            };
          }
          return chat;
        })
      );

      try {
        const payload = selectedProfileId
          ? {
              content,
              model: selectedModel.id,
              use_consensus: true,
              profile_id: selectedProfileId,
            }
          : {
              content,
              model: selectedModel.id,
              use_consensus: true,
              guiding_model: guidingModel?.id || selectedModel.id,
              participant_models: participantModels
                .filter((m): m is AIModel => m !== null)
                .map(m => m.id),
              max_rounds: 6,
            } as any;

        const assistantMsg = await apiSendMessage(chatId!, payload);
        
        // Replace optimistic placeholder with backend placeholder
        setChatSessions(prev =>
          prev.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: [
                    ...chat.messages.filter(m => m !== placeholderMsg),
                    {
                      role: assistantMsg.role as MessageRole,
                      content: assistantMsg.content || 'Running consensus...',
                      timestamp: new Date(assistantMsg.created_at),
                      model: assistantMsg.model,
                      isConsensus: true,
                      channelId: assistantMsg.channel?.id,
                    },
                  ],
                }
              : chat,
          ),
        );

        // Poll messages until consensus answer arrives
        const pollIntervalMs = 4000;
        const intervalId = window.setInterval(async () => {
          try {
            const msgs = await apiListMessages(chatId!);
            const finished = msgs.find(
              m => m.model === 'consensus' && m.content && m.content.trim() !== '',
            );
            if (finished) {
              setChatSessions(prev =>
                prev.map(chat =>
                  chat.id === chatId
                    ? {
                        ...chat,
                        messages: msgs.map(msg => ({
                          role: msg.role as MessageRole,
                          content: msg.content,
                          timestamp: new Date(msg.created_at),
                          model: msg.model,
                          isConsensus: msg.model === 'consensus',
                          channelId: msg.channel?.id,
                        })),
                      }
                    : chat,
                ),
              );
              clearInterval(intervalId);
              setIsAgentBusy(false);
              setBusyChatId(null);
      abortControllerRef.current = null;
            }
          } catch (err) {
            console.error('Consensus polling failed', err);
            clearInterval(intervalId);
            setIsAgentBusy(false);
            setBusyChatId(null);
      abortControllerRef.current = null;
          }
        }, pollIntervalMs);
      } catch (err) {
        console.error('Failed to send consensus message:', err);
        setIsAgentBusy(false);
        setBusyChatId(null);
      abortControllerRef.current = null;
      }

      return; // Skip chat message API flow
    }

    // Default non-consensus flow
    try {
      setLoading(true);
      const controller = new AbortController();
      abortControllerRef.current = controller;
      const res = await fetch(`${API_BASE}/chats/${chatId}/messages/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ content, model: selectedModel.id }),
        credentials: 'include',
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        throw new Error(`API ${res.status}: ${res.statusText}`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';

      // Insert placeholder assistant message
      setChatSessions(prev =>
        prev.map(chat =>
          chat.id === chatId
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    role: 'assistant' as MessageRole,
                    content: '',
                    timestamp: new Date(),
                    model: selectedModel.id,
                  },
                ],
              }
            : chat,
        ),
      );

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        if (!chunk) continue;
        assistantContent += chunk;
        const contentSnapshot = assistantContent;
        setChatSessions(prev =>
          prev.map(chat =>
            chat.id === chatId
              ? {
                  ...chat,
                  messages: chat.messages.map((m, idx) =>
                    idx === chat.messages.length - 1 ? { ...m, content: contentSnapshot } : m,
                  ),
                }
              : chat,
          ),
        );
      }

      setLoading(false);
      setIsAgentBusy(false);
      setBusyChatId(null);
      abortControllerRef.current = null;
    } catch (err) {
      if ((err as any)?.name === 'AbortError') {
        setLoading(false);
        setIsAgentBusy(false);
        setBusyChatId(null);
        abortControllerRef.current = null;
        return;
      }
      setLoading(false);
      setIsAgentBusy(false);
      setBusyChatId(null);
      abortControllerRef.current = null;
      // For genuine errors (non-abort) optionally handle error: remove the user's message or show error
      setChatSessions(prev =>
        prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: chat.messages.filter(m => !(m.role === 'user' && m.content === content)),
              lastUpdated: chat.lastUpdated,
            };
          }
          return chat;
        })
      );
      console.error('Failed to send message:', err);
    }
  };

  const cancelGeneration = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (!busyChatId) return;
    try {
      await cancelRequest(busyChatId);
    } catch (err) {
      console.warn('Cancel request failed', err);
    } finally {
      setIsAgentBusy(false);
      setBusyChatId(null);
      abortControllerRef.current = null;
    }
  };

  // Build context value and render provider
  const contextValue: ChatContextType = {
    chatSessions,
    activeChatId,
    selectedModel,
    availableModels,
    startNewChat,
    selectChat,
    deleteChat,
    sendMessage,
    setSelectedModel,
    loading,
    isAgentBusy,
    cancelGeneration,
  };

  if (!selectedModel || selectedModel.id === '') {
    return <div className="flex items-center justify-center h-full text-gray-400">Loading models...</div>;
  }

  return (
    <ChatContext.Provider value={contextValue}>
      {children}
    </ChatContext.Provider>
  );
};

// Custom hook to use the chat context
export const useChatContext = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
};