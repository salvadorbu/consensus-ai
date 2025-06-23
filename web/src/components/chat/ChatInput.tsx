import React, { useState, useRef, useEffect } from 'react';
import { Send, Settings } from 'lucide-react';
import ModelSelector from './ModelSelector';
import { useAuth } from '../../context/AuthContext';
import ProfileSelector from './ProfileSelector';
import ConsensusButton from './ConsensusButton';
import { useChatContext } from '../../context/ChatContext';

interface ChatInputProps {
  onOpenSettings?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onOpenSettings }) => {
  const [inputValue, setInputValue] = useState('');
  const [useConsensus, setUseConsensus] = useState(false);
  const { sendMessage, isAgentBusy, cancelGeneration } = useChatContext();
  const { isAuthenticated } = useAuth();

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Dynamically adjust textarea height based on content.
  // It will grow until it reaches roughly six lines of text, after which
  // a vertical scrollbar appears instead of further expansion.
  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    // Reset height so scrollHeight is computed correctly after content changes
    textarea.style.height = 'auto';

    const desiredHeight = textarea.scrollHeight;

    // Calculate maximum allowed height as six lines
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 24;
    const maxHeight = lineHeight * 6;

    if (desiredHeight <= maxHeight) {
      textarea.style.height = `${desiredHeight}px`;
      textarea.style.overflowY = 'hidden';
    } else {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = 'auto';
    }
  };

  // Re-calculate height whenever text changes
  useEffect(() => {
    adjustHeight();
  }, [inputValue]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAgentBusy) return;

    const trimmed = inputValue.trim();
    if (!trimmed) return;

    sendMessage(trimmed, useConsensus);
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isAgentBusy) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className="relative max-w-4xl mx-auto"
    >
      <div 
        className="
          p-[1px] rounded-xl
          bg-gradient-to-r from-blue-500 to-purple-600
          shadow-lg
        "
      >
        <div className="relative bg-gray-800 rounded-xl p-3">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isAgentBusy ? "Please wait for the agent to respond..." : "Message ConsensusAI..."}
            rows={1}
            className="
              w-full resize-none bg-transparent border-0 focus:ring-0
              text-white placeholder-gray-400 py-2 pr-12 pl-2
              min-h-[40px] overflow-y-auto
            "
            style={{ outline: 'none' }}
          />

          <div className="flex items-center justify-between mt-2 text-gray-400">
            <div className="flex items-center space-x-2">
              {useConsensus ? (
                <ProfileSelector />
              ) : (
                <ModelSelector disabled={false} />
              )}
              <ConsensusButton active={useConsensus} onClick={() => setUseConsensus(!useConsensus)} />
            </div>

            <div className="flex items-center space-x-2">
              {isAuthenticated && (
                <button 
                  type="button" 
                  className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
                  onClick={onOpenSettings}
                  aria-label="Open settings"
                >
                  <Settings size={16} />
                </button>
              )}
              <button 
                type="submit" 
                disabled={!inputValue.trim() || isAgentBusy}
                className={`
                  p-1.5 rounded-md transition-colors
                  ${inputValue.trim() && !isAgentBusy
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'hidden'}
                `}
                title={isAgentBusy ? "Please wait for the agent to respond" : undefined}
              >
                <Send size={16} />
              </button>
              {isAgentBusy && (
                <button
                  type="button"
                  onClick={cancelGeneration}
                  className="p-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white transition-colors"
                  title="Stop generation"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-4 h-4"
                  >
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ChatInput;