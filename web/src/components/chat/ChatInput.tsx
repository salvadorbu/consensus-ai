import React, { useState } from 'react';
import { Send, Settings } from 'lucide-react';
import ModelSelector from './ModelSelector';
import ConsensusButton from './ConsensusButton';
import { useChatContext } from '../../context/ChatContext';

interface ChatInputProps {
  onOpenSettings?: () => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onOpenSettings }) => {
  const [inputValue, setInputValue] = useState('');
  const [useConsensus, setUseConsensus] = useState(false);
  const { sendMessage } = useChatContext();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      sendMessage(inputValue, useConsensus);
      setInputValue('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
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
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Message ConsensusAI..."
            rows={1}
            className="
              w-full resize-none bg-transparent border-0 focus:ring-0
              text-white placeholder-gray-400 py-2 pr-12 pl-2
              min-h-[40px] max-h-[200px] overflow-y-auto
            "
            style={{ outline: 'none' }}
          />

          {/* Bottom controls */}
          <div className="flex items-center justify-between mt-2 text-gray-400">
            <div className="flex items-center space-x-2">
              <ModelSelector />
              <ConsensusButton active={useConsensus} onClick={() => setUseConsensus(!useConsensus)} />
            </div>

            <div className="flex items-center space-x-2">
              <button 
                type="button" 
                className="p-1.5 rounded-md hover:bg-gray-700 transition-colors"
                onClick={onOpenSettings}
                aria-label="Open settings"
              >
                <Settings size={16} />
              </button>
              <button 
                type="submit" 
                disabled={!inputValue.trim()}
                className={`
                  p-1.5 rounded-md transition-colors
                  ${inputValue.trim() 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-gray-700 text-gray-500 cursor-not-allowed'}
                `}
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ChatInput;