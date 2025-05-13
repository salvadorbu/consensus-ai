import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';

// Type for model (reuse from ModelSelector)
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

const PAGE_SIZE = 8;

interface DropdownModelSelectorProps {
  value?: AIModel | null;
  onChange?: (model: AIModel) => void;
}

const DropdownModelSelector: React.FC<DropdownModelSelectorProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [search, setSearch] = useState('');
  const [displayedModels, setDisplayedModels] = useState<AIModel[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const [page, setPage] = useState(1);

  // Fetch models.json on mount
  useEffect(() => {
    fetch('/src/data/models.json')
      .then(res => res.json())
      .then(data => setModels(data))
      .catch(() => setModels([]));
  }, []);

  // Filter models by search
  const filteredModels = models.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.description?.toLowerCase().includes(search.toLowerCase())
  );

  // Handle pagination for infinite scroll
  useEffect(() => {
    setDisplayedModels(filteredModels.slice(0, PAGE_SIZE));
    setPage(1);
    setHasMore(filteredModels.length > PAGE_SIZE);
  }, [search, models]);

  // Load more items when scrolling
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    setLoading(true);
    setTimeout(() => {
      const nextPage = page + 1;
      const newModels = filteredModels.slice(0, nextPage * PAGE_SIZE);
      setDisplayedModels(newModels);
      setPage(nextPage);
      setHasMore(newModels.length < filteredModels.length);
      setLoading(false);
    }, 200); // Simulate async
  }, [filteredModels, page, hasMore, loading]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!isOpen || !listRef.current) return;
    const listElement = listRef.current;
    const sentinel = listElement.querySelector('#scroll-sentinel');
    if (!sentinel) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new window.IntersectionObserver((entries) => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    observer.current.observe(sentinel);
    return () => observer.current?.disconnect();
  }, [isOpen, loadMore, hasMore, displayedModels]);

  const handleSelect = (model: AIModel) => {
    onChange?.(model);
    setIsOpen(false);
  };

  return (
    <div className="relative w-full max-w-xs">
      <button
        className="w-full px-4 py-2 border border-gray-700 bg-gray-800 rounded-md flex items-center justify-between text-left focus:outline-none hover:border-blue-500"
        onClick={() => setIsOpen((o) => !o)}
        type="button"
      >
        <span className="truncate">
          {value ? (
            <>
              <span className="font-semibold text-gray-100">{value.name}</span>
              <span className="ml-2 text-gray-400 text-xs">{value.description}</span>
            </>
          ) : (
            <span className="text-gray-400">Select a model...</span>
          )}
        </span>
        <ChevronDown size={18} />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-2 w-full bg-gray-900 border border-gray-700 rounded-md shadow-lg max-h-72 overflow-auto animate-fade-in flex flex-col" ref={listRef}>
          <input
            className="p-2 border-b border-gray-800 bg-gray-800 text-gray-100 focus:outline-none"
            placeholder="Search models..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {displayedModels.length === 0 && (
            <div className="p-4 text-gray-400 text-center">No models found.</div>
          )}
          {displayedModels.map((model) => (
            <button
              key={model.id}
              className={`flex items-center w-full px-4 py-2 hover:bg-blue-800 focus:bg-blue-700 text-left ${value?.id === model.id ? 'bg-blue-900' : ''}`}
              onClick={() => handleSelect(model)}
              type="button"
            >
              <span className="font-medium text-gray-100 flex items-center">
                {model.name}
                {value?.id === model.id && <CheckCircle className="ml-2 text-green-400" size={16} />}
              </span>
            </button>
          ))}
          <div id="scroll-sentinel" className="h-6"></div>
          {loading && <div className="p-2 text-center text-gray-400">Loading...</div>}
        </div>
      )}
    </div>
  );
};

export default DropdownModelSelector;
