import React, { useEffect, useRef } from 'react';
import ChatMessages from './ChatMessages';
import ChatInput from './ChatInput';
import { useChatContext } from '../../context/ChatContext';

interface ChatContainerProps {
  onOpenSettings: () => void;
}

const ChatContainer: React.FC<ChatContainerProps> = ({ onOpenSettings }) => {
  const { activeChatId, chatSessions } = useChatContext();
  const containerRef = useRef<HTMLDivElement>(null);

  const activeChat = chatSessions.find(chat => chat.id === activeChatId);
  
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [activeChat?.messages]);

  return (
    <div className="flex flex-col h-full relative">
      <div 
        ref={containerRef}
        className="flex-1 overflow-y-auto py-4 px-4 md:px-8"
      >
        {!activeChatId || !activeChat ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="max-w-md p-6">
              <h1 className="text-3xl font-bold mb-6 animate-gradient bg-gradient-to-r from-blue-400 via-purple-500 to-blue-600">
                Welcome to ConsensusAI
              </h1>
              <p className="mb-4 text-gray-300">
                Your advanced AI assistant that combines multiple models to provide consensus-driven responses.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                  <h3 className="font-medium mb-2">Ask any question</h3>
                  <p className="text-sm text-gray-400">Get different AI models to collaborate on tasks</p>
                </div>
                <div className="p-4 rounded-lg bg-gray-800 border border-gray-700">
                  <h3 className="font-medium mb-2">Compare responses</h3>
                  <p className="text-sm text-gray-400">See how different models respond to your queries</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <ChatMessages messages={activeChat.messages} />
        )}
      </div>

      <div className="p-4 md:p-6 border-t border-gray-800">
        <ChatInput onOpenSettings={onOpenSettings} />
      </div>
    </div>
  );
};

export default ChatContainer;