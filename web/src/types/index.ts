export type MessageRole = 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: Date;
  model?: string;
  isConsensus?: boolean;
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
  capabilities?: string[];
}