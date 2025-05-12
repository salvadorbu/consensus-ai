import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ChatSession, AIModel } from '../types';
import type { MessageRole } from '../types/index';
import {
  listChats,
  createChat as apiCreateChat,
  getChat,
  deleteChat as apiDeleteChat,
  sendMessage as apiSendMessage,
} from '../api/chats';

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

  // Load available models from models.json
  useEffect(() => {
    fetch('/src/data/models.json')
      .then(res => res.json())
      .then(data => {
        setAvailableModels(data);
        // Prefer anthropic/claude-3.7-sonnet if present
        const defaultModel = data.find((m: AIModel) => m.id === 'anthropic/claude-3.7-sonnet') || data[0];
        if (defaultModel) setSelectedModel(defaultModel);
      })
      .catch(() => setAvailableModels([]));
  }, []);

  // Fetch chats on mount
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
    fetchChats();
  }, []);

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
        // Only overwrite messages if local messages are still empty (prevents overwriting optimistic messages)
        setChatSessions(prev => prev.map(chat => {
          if (chat.id === activeChatId) {
            if (chat.messages && chat.messages.length > 0) {
              // Don't overwrite optimistic messages
              return chat;
            }
            return {
              ...chat,
              messages: chatWithMessages.messages.map(msg => ({
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.created_at),
                model: msg.model,
              })),
              lastUpdated: new Date(chatWithMessages.updated_at),
            };
          }
          return chat;
        }));
        fetchedChatIdsRef.current.add(activeChatId); // Mark as fetched after successful fetch
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
    } catch (err) {
      console.error('Failed to create chat:', err);
    }
  };

  // Select a chat
  const selectChat = (chatId: string) => {
    setActiveChatId(chatId);
  };

  // Delete a chat using the backend API
  const deleteChat = async (chatId: string) => {
    try {
      await apiDeleteChat(chatId);
      setChatSessions(prev => prev.filter(chat => chat.id !== chatId));
      // If active chat is deleted, set active to null or another chat
      if (activeChatId === chatId) {
        const remainingChats = chatSessions.filter(chat => chat.id !== chatId);
        setActiveChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete chat:', err);
    }
  };

  // Send a message using the backend API
  const sendMessage = async (content: string, useConsensus?: boolean) => {
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
    try {
      setLoading(true);
      const apiMsg = await apiSendMessage(chatId, {
        content,
        model: selectedModel.id,
        ...(useConsensus !== undefined ? { use_consensus: useConsensus } : {}),
      });
      // 2. Add the bot's response
      setChatSessions(prev =>
        prev.map(chat => {
          if (chat.id === chatId) {
            return {
              ...chat,
              messages: [...chat.messages, {
                role: apiMsg.role,
                content: apiMsg.content,
                timestamp: new Date(apiMsg.created_at),
                model: apiMsg.model,
              }],
              lastUpdated: new Date(),
            };
          }
          return chat;
        })
      );
      setLoading(false);
    } catch (err) {
      setLoading(false);
      // Optionally handle error: remove the user's message or show error
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