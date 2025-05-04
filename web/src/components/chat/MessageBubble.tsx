import React from 'react';
import { Message } from '../../types';
import { User, Bot } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div 
          className={`
            flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center
            ${isUser ? 'ml-3 bg-blue-600' : 'mr-3 bg-purple-600'}
          `}
        >
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Message content */}
        <div 
          className={`
            p-3 rounded-xl 
            ${isUser 
              ? 'bg-blue-600 text-white rounded-tr-none' 
              : 'bg-gray-800 text-white rounded-tl-none border border-gray-700'
            }
          `}
        >
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
          
          {/* Model info - only for AI messages */}
          {!isUser && message.model && (
            <div className="mt-2 text-xs opacity-70">
              {message.model}
              {message.isConsensus && (
                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-purple-700 text-white text-xs">
                  Consensus
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;