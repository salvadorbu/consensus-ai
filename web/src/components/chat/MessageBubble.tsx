import React, { useState } from 'react';
import Markdown from '../Markdown';
import { Message } from '../../types';
import { Expand } from 'lucide-react';
import ConsensusChannelView from '../chat/ConsensusChannelView'

interface MessageBubbleProps {
  message: Message;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [showChannel, setShowChannel] = useState(false);

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
              {/* Footer info for AI messages */}
              {!isUser && (
                <div className="mt-2 text-xs opacity-70 flex items-center justify-between">
                  {message.isConsensus ? (
                    <span className="px-1.5 py-0.5 rounded-full bg-purple-700 text-white text-xs">
                      Consensus
                    </span>
                  ) : (
                    message.model
                  )}

                  {/* Expand icon on right */}
                  {message.isConsensus && message.channelId && (
                    <button
                      type="button"
                      className="text-gray-400 hover:text-white transition-colors ml-2"
                      onClick={() => setShowChannel(prev => !prev)}
                      aria-label={showChannel ? 'Hide channel discussion' : 'View channel discussion'}
                    >
                      <Expand size={14} />
                    </button>
                  )}
                </div>
              )}

              {/* Embedded channel discussion view */}
              {showChannel && message.channelId && (
                <div className="mt-3">
                  <ConsensusChannelView channelId={message.channelId} />
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
