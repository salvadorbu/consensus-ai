export type MessageRole = 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: Date;
  model?: string;
  isConsensus?: boolean;
  channelId?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  lastUpdated: Date;
}

export interface AIModel {
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
  capabilities?: string[];
}