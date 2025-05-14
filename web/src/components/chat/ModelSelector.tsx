import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';

// Type for model (fallback if not in types)
type AIModel = {
  id: string;
  name: string;
  description: string;
  created?: number;
  context_length?: number;
  architecture?: {
    modality?: string;
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer?: string;
    instruct_type?: string | null;
  };
  pricing?: Record<string, string>;
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number | null;
    is_moderated?: boolean;
  };
  [key: string]: any;
};

const PAGE_SIZE = 5;

const ModelSelector: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { selectedModel, setSelectedModel } = useChatContext();

  // Fetch models.json on mount
  useEffect(() => {
    fetch('/data/models.json')
      .then(res => res.json())
      .then(data => setModels(data))
      .catch(() => setModels([]));
  }, []);

  // Filtered models based on search
  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.description?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.max(1, Math.ceil(filteredModels.length / PAGE_SIZE));
  const paginatedModels = filteredModels.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

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

  // Reset page when search changes
  useEffect(() => {
    setPage(1);
  }, [search]);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-700 transition-colors"
      >
        <span className="text-sm">{selectedModel?.name || 'Select Model'}</span>
        <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div 
          className="
            absolute bottom-full mb-2 left-0 min-w-[320px] z-10
            bg-gray-800 border border-gray-700 rounded-lg shadow-xl
            overflow-hidden
          "
        >
          <div className="p-2">
            <h3 className="text-xs text-gray-400 px-2 py-1.5 uppercase tracking-wider">
              Select Model
            </h3>
            <input
              type="text"
              placeholder="Search models..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full mb-2 px-2 py-1.5 rounded bg-gray-700 text-sm text-gray-100 placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <div className="flex flex-col gap-1 max-h-96 overflow-y-auto">
              {paginatedModels.length === 0 && (
                <div className="text-xs text-gray-400 px-2 py-2">No models found.</div>
              )}
              {paginatedModels.map(model => (
                <button
                  key={model.id}
                  onClick={() => handleModelSelect(model)}
                  className={`
                    w-full px-3 py-2 text-left flex items-center justify-between rounded-md
                    ${selectedModel?.id === model.id ? 'bg-gray-700' : 'hover:bg-gray-700/50'}
                    transition-colors
                  `}
                >
                  <div className="flex flex-col gap-0.5">
                    <span className="font-medium text-sm">{model.name}</span>
                    <span className="text-xs text-gray-400 line-clamp-2">{model.description}</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {model.context_length !== undefined && model.context_length !== null && (
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">Ctx: {model.context_length.toLocaleString()}</span>
                      )}
                      {model.architecture?.modality && (
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">{model.architecture.modality}</span>
                      )}
                      {Array.isArray(model.architecture?.input_modalities) && model.architecture.input_modalities.length > 0 && (
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">Input: {model.architecture.input_modalities.join(', ')}</span>
                      )}
                      {Array.isArray(model.architecture?.output_modalities) && model.architecture.output_modalities.length > 0 && (
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">Output: {model.architecture.output_modalities.join(', ')}</span>
                      )}
                      {model.pricing && Object.values(model.pricing).some(v => v !== '0') && (
                        <span className="text-xs bg-gray-700 px-2 py-0.5 rounded text-gray-300">Paid</span>
                      )}
                    </div>
                  </div>
                  {selectedModel?.id === model.id && (
                    <CheckCircle size={16} className="text-blue-500 ml-2" />
                  )}
                </button>
              ))}
            </div>
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-2">
                <button
                  className="p-1 rounded hover:bg-gray-700 disabled:opacity-50"
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-xs text-gray-400">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="p-1 rounded hover:bg-gray-700 disabled:opacity-50"
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;