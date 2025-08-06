import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';

import GrokIcon from '../../assets/providers/grok.svg?react';
import GeminiIcon from '../../assets/providers/gemini.svg?react';
import DeepseekIcon from '../../assets/providers/deepseek.svg?react';
import OpenaiIcon from '../../assets/providers/openai.svg?react';
import MistralIcon from '../../assets/providers/mistral.svg?react';
import MicrosoftIcon from '../../assets/providers/microsoft.svg?react';
import MetaIcon from '../../assets/providers/meta.svg?react';
import AnthropicIcon from '../../assets/providers/anthropic.svg?react';
import QwenIcon from '../../assets/providers/qwen.svg?react';
import OpenRouterIcon from '../../assets/providers/openrouter.svg?react';
import { AIModel } from '../../types';
import { listModels } from '../../api/models';
import { useChatContext } from '../../context/ChatContext';

// ---------------------------------------------------------------------------
// Provider helpers
// ---------------------------------------------------------------------------
const providerIconMap: Record<string, React.FC<React.SVGProps<SVGSVGElement>>> = {
  xAI: GrokIcon,
  Google: GeminiIcon,
  DeepSeek: DeepseekIcon,
  OpenAI: OpenaiIcon,
  Mistral: MistralIcon,
  Microsoft: MicrosoftIcon,
  Meta: MetaIcon,
  Anthropic: AnthropicIcon,
  Qwen3: QwenIcon,
  OpenRouter: OpenRouterIcon,
};

function parseModelName(name: string): { provider: string | null; short: string } {
  const match = /^([A-Za-z]+):\s*(.+)$/.exec(name);
  if (match) {
    return { provider: match[1], short: match[2] };
  }
  return { provider: null, short: name };
}

const PAGE_SIZE = 20;

interface ModelSelectorProps {
  disabled?: boolean;
  value?: AIModel | null;
  onChange?: (model: AIModel) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ disabled = false, value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [models, setModels] = useState<AIModel[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasReachedEnd, setHasReachedEnd] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { selectedModel: ctxModel, setSelectedModel: setCtxModel, modelsLoading } = useChatContext();

  // Determine controlled vs uncontrolled (ChatContext) mode
  const controlled = typeof value !== 'undefined' && typeof onChange === 'function';
  const selectedModel = controlled ? value : ctxModel;
  const setSelectedModel = controlled ? onChange! : setCtxModel;

  const fetchModels = async (pageNum: number, query: string) => {
    try {
      setLoading(true);
      const data = await listModels({ page: pageNum, limit: PAGE_SIZE, q: query });
      if (pageNum === 1) {
        setModels(data.results);
        setHasReachedEnd(false);
      } else {
        setModels(prev => [...prev.filter(model => !data.results.find(m => m.id === model.id)), ...data.results]);
      }
      setTotal(data.total);
      if (!selectedModel?.id && data.default_model && !controlled) {
        setSelectedModel(data.default_model);
      }
    } catch (err: any) {
      // Handle 404 errors differently based on context
      if (typeof err?.message === 'string' && err.message.includes('404')) {
        if (pageNum === 1) {
          // 404 on first page means no models found for search - clear results
          setModels([]);
          setTotal(0);
        } else {
          // 404 on subsequent pages means we've reached the end of pagination
          setHasReachedEnd(true);
        }
      } else {
        // Log unexpected errors to aid debugging
        console.error('Model fetch failed', err?.message ?? err);
        // Only clear models on genuine errors, not pagination end
        if (pageNum === 1) {
          setModels([]);
          setTotal(0);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch when dropdown open, page changes or search changes
  useEffect(() => {
    if (!isOpen) return;
    fetchModels(page, search);
  }, [isOpen, page, search]);

  // Show loading state when context is loading models
  const isLoading = loading || modelsLoading;

  // Reset to first page when search term changes
  useEffect(() => {
    setPage(1);
    setHasReachedEnd(false);
  }, [search]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleDropdown = () => {
    if (disabled) return;
    setIsOpen(prev => !prev);
  };

  const handleSelect = (model: AIModel) => {
    setSelectedModel(model);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={toggleDropdown}
        disabled={disabled}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-colors ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}`}
      >
        {(() => {
            if (modelsLoading) return <span className="truncate">Loading models...</span>;
            if (!selectedModel) return <span className="truncate">Select model</span>;
            const { provider, short } = parseModelName(selectedModel.name);
            const Icon = provider && providerIconMap[provider] ? providerIconMap[provider] : OpenRouterIcon;
            return (
              <span className="truncate flex items-center gap-1">
                <Icon className="w-4 h-4 inline-block text-gray-400 opacity-70" />
                {short}
              </span>
            );
          })()}
        <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="absolute bottom-full mb-2 left-0 min-w-[320px] z-10 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          <div className="p-2">
            <h3 className="text-xs text-gray-400 px-2 py-1.5 uppercase tracking-wider">Select Model</h3>
            <input
              type="text"
              placeholder="Search models..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full mb-2 px-2 py-1.5 rounded bg-gray-700 text-sm text-gray-100 placeholder-gray-400 border border-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
            />
            <div
              className="flex flex-col gap-1 max-h-96 overflow-y-auto"
              onScroll={e => {
                const target = e.currentTarget;
                if (
                  !isLoading &&
                  !hasReachedEnd &&
                  models.length < total &&
                  target.scrollTop + target.clientHeight >= target.scrollHeight - 10
                ) {
                  setPage(p => p + 1);
                }
              }}
            >
              {isLoading && <div className="text-xs text-gray-400 px-2 py-2">Loading...</div>}
              {!isLoading && models.length === 0 && (
                <div className="text-xs text-gray-400 px-2 py-2">No models found.</div>
              )}
              {models.map(model => (
                <button
                  key={model.id}
                  onClick={() => handleSelect(model)}
                  className={`w-full px-3 py-2 text-left flex items-center justify-between rounded-md ${selectedModel?.id === model.id ? 'bg-gray-700' : 'hover:bg-gray-700/50'} transition-colors`}
                >
                  <div className="flex items-center gap-2">
                    {(() => {
                      const { provider, short } = parseModelName(model.name);
                      const Icon = provider && providerIconMap[provider] ? providerIconMap[provider] : OpenRouterIcon;
                      return (
                        <>
                          <Icon className="w-4 h-4 mr-2 inline-block text-gray-400" />
                          <span className="font-medium text-sm">{short}</span>
                        </>
                      );
                    })()}
                  </div>
                  {selectedModel?.id === model.id && <CheckCircle size={16} className="text-blue-500 ml-2" />}
                </button>
              ))}
            </div>
            {isLoading && models.length < total && !hasReachedEnd && (
              <div className="text-xs text-gray-400 px-2 py-2 text-center">Loading more...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelSelector;
