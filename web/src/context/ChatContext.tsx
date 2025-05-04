import React, { createContext, useContext, useState, ReactNode } from 'react';
import { ChatSession, Message, AIModel } from '../types';

// Define available AI models
const AVAILABLE_MODELS: AIModel[] = [
  {
    id: 'gpt-4',
    name: 'GPT-4',
    description: 'Advanced reasoning and comprehension'
  },
  {
    id: 'claude-3',
    name: 'Claude 3',
    description: 'Balanced between speed and quality'
  },
  {
    id: 'llama-3',
    name: 'Llama 3',
    description: 'Fast responses with good accuracy'
  },
  {
    id: 'gemini-pro',
    name: 'Gemini Pro',
    description: 'Multimodal capabilities'
  }
];

// Sample AI responses for demo purposes
const SAMPLE_RESPONSES: Record<string, string> = {
  'gpt-4': "I'm simulating a GPT-4 response. GPT-4 is known for nuanced understanding and logical reasoning.",
  'claude-3': "This is a simulated Claude 3 response. Claude is known for thoughtful, detailed answers with good understanding of context.",
  'llama-3': "Simulating Llama 3 here. Llama models are known for efficiency and strong performance across various tasks.",
  'gemini-pro': "This is a simulated Gemini Pro response. Gemini excels at multimodal tasks and provides comprehensive answers.",
};

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
}

// Create context
const ChatContext = createContext<ChatContextType | undefined>(undefined);

// Provider component
export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<AIModel>(AVAILABLE_MODELS[0]);

  // Generate unique ID
  const generateId = () => Math.random().toString(36).substring(2, 9);

  // Start a new chat
  const startNewChat = () => {
    const newChatId = generateId();
    const newChat: ChatSession = {
      id: newChatId,
      title: 'New Conversation',
      messages: [],
      lastUpdated: new Date()
    };

    setChatSessions(prev => [newChat, ...prev]);
    setActiveChatId(newChatId);
  };

  // Select a chat
  const selectChat = (chatId: string) => {
    setActiveChatId(chatId);
  };

  // Delete a chat
  const deleteChat = (chatId: string) => {
    setChatSessions(prev => prev.filter(chat => chat.id !== chatId));
    
    // If active chat is deleted, set active to null or another chat
    if (activeChatId === chatId) {
      const remainingChats = chatSessions.filter(chat => chat.id !== chatId);
      setActiveChatId(remainingChats.length > 0 ? remainingChats[0].id : null);
    }
  };

  // Send a message
  const sendMessage = (content: string, useConsensus = false) => {
    if (!activeChatId) return;

    const userMessage: Message = {
      role: 'user',
      content,
      timestamp: new Date()
    };

    // Update chat session with user message
    setChatSessions(prev => 
      prev.map(chat => {
        if (chat.id === activeChatId) {
          // Update chat title if it's the first message
          const isFirstMessage = chat.messages.length === 0;
          const newTitle = isFirstMessage ? truncateTitle(content) : chat.title;
          
          return {
            ...chat,
            title: newTitle,
            messages: [...chat.messages, userMessage],
            lastUpdated: new Date()
          };
        }
        return chat;
      })
    );

    // Simulate AI response
    setTimeout(() => {
      if (useConsensus) {
        // Generate multiple responses and then a consensus
        const modelResponses: Message[] = [];
        
        // Add individual model responses
        AVAILABLE_MODELS.forEach(model => {
          modelResponses.push({
            role: 'assistant',
            content: SAMPLE_RESPONSES[model.id] || `Response from ${model.name}`,
            timestamp: new Date(),
            model: model.name
          });
        });
        
        // Add consensus response
        const consensusResponse: Message = {
          role: 'assistant',
          content: "This is a consensus response that combines insights from multiple AI models. The consensus approach helps eliminate biases and provides more reliable information.",
          timestamp: new Date(),
          model: "Consensus Engine",
          isConsensus: true
        };
        
        // Update chat with all responses
        setChatSessions(prev => 
          prev.map(chat => {
            if (chat.id === activeChatId) {
              return {
                ...chat,
                messages: [...chat.messages, ...modelResponses, consensusResponse],
                lastUpdated: new Date()
              };
            }
            return chat;
          })
        );
      } else {
        // Just respond with selected model
        const aiResponse: Message = {
          role: 'assistant',
          content: SAMPLE_RESPONSES[selectedModel.id] || `Response from ${selectedModel.name}`,
          timestamp: new Date(),
          model: selectedModel.name
        };
        
        // Update chat with AI response
        setChatSessions(prev => 
          prev.map(chat => {
            if (chat.id === activeChatId) {
              return {
                ...chat,
                messages: [...chat.messages, aiResponse],
                lastUpdated: new Date()
              };
            }
            return chat;
          })
        );
      }
    }, 1000);
  };

  // Helper to truncate message for chat title
  const truncateTitle = (message: string, maxLength = 30) => {
    if (message.length <= maxLength) return message;
    return message.substring(0, maxLength) + '...';
  };

  const contextValue: ChatContextType = {
    chatSessions,
    activeChatId,
    selectedModel,
    availableModels: AVAILABLE_MODELS,
    startNewChat,
    selectChat,
    deleteChat,
    sendMessage,
    setSelectedModel
  };

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