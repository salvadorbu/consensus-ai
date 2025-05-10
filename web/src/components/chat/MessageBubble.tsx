import React from 'react';
import Markdown from '../Markdown';
import { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className="w-full flex justify-center">
        <div className="max-w-4xl w-full flex">
          <div className={`w-full flex ${isUser ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`p-3 rounded-xl mb-2
                ${isUser
                  ? 'bg-blue-600 text-white rounded-tr-none'
                  : 'bg-gray-800 text-white rounded-tl-none border border-gray-700'
                }
                whitespace-pre-wrap break-words
                `}
              style={{ minWidth: 0 }}
            >
              <Markdown content={message.content} />
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
      </div>
    </div>
  );
};

export default MessageBubble;