import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';
import { AIModel } from '../../types';

const ModelSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { selectedModel, setSelectedModel, availableModels } = useChatContext();

  const toggleDropdown = () => setIsOpen(!isOpen);
  
  const handleModelSelect = (model: AIModel) => {
    setSelectedModel(model);
    setIsOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-700 transition-colors"
      >
        <span className="text-sm">{selectedModel.name}</span>
        <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div 
          className="
            absolute bottom-full mb-2 left-0 min-w-[200px] z-10
            bg-gray-800 border border-gray-700 rounded-lg shadow-xl
            overflow-hidden
            animate-in fade-in zoom-in-95 duration-150
          "
        >
          <div className="p-2">
            <h3 className="text-xs text-gray-400 px-2 py-1.5 uppercase tracking-wider">
              Select Model
            </h3>
            <div className="mt-1">
              {availableModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  className={`
                    w-full px-3 py-2 text-left flex items-center justify-between rounded-md
                    ${selectedModel.id === model.id ? 'bg-gray-700' : 'hover:bg-gray-700/50'}
                    transition-colors
                  `}
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{model.name}</span>
                    <span className="text-xs text-gray-400">{model.description}</span>
                  </div>
                  {selectedModel.id === model.id && (
                    <CheckCircle size={16} className="text-blue-500" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;