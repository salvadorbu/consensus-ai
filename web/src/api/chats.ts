export type Role = 'user' | 'assistant';

// -----------------------------------------------------------------------------
// DTOs & Types mirroring the FastAPI schemas (minimal subset that the frontend
// needs). Field names follow the *snake_case* convention returned by FastAPI
// to avoid any manual mapping on the client.
// -----------------------------------------------------------------------------

export interface Chat {
  id: string;
  name: string;
  default_model: string;
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}

export interface Message {
  id: string;
  chat_id: string;
  role: Role;
  model: string;
  content: string;
  created_at: string; // ISO timestamp
}

import type { ConsensusChannel } from '../types/consensus';
import { request } from './request';

export interface ChatWithMessages extends Chat {
  messages: Message[];
  channels: ConsensusChannel[];
}

export interface ChatCreateDto {
  name: string;
  default_model: string;
}

export interface ChatUpdateDto {
  name?: string;
  default_model?: string;
}

export interface UserMessageCreateDto {
  content: string;
  model?: string; // Optional override of the chat's default_model
  use_consensus?: boolean;
  guiding_model?: string;
  participant_models?: string[];
  profile_id?: string;
  max_rounds?: number;
}



// Public helper functions (CRUD + messaging)
// -----------------------------------------------------------------------------

export const ChatsApi = {
  // Chats ----------------------------------------------------------------------

  createChat: (data: ChatCreateDto): Promise<Chat> =>
    request('/chats', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listChats: (): Promise<Chat[]> => request('/chats'),

  getChat: (chatId: string): Promise<ChatWithMessages> =>
    request(`/chats/${chatId}`),

  updateChat: (chatId: string, data: ChatUpdateDto): Promise<Chat> =>
    request(`/chats/${chatId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  deleteChat: (chatId: string): Promise<void> =>
    request<void>(`/chats/${chatId}`, {
      method: 'DELETE',
    }),

  // Cancel -----------------------------------------------------------
  cancelRequest: (chatId: string): Promise<void> =>
    request<void>(`/chats/${chatId}/cancel`, {
      method: 'POST',
    }),

  // Messages -------------------------------------------------------------------

  sendMessage: (
    chatId: string,
    data: UserMessageCreateDto,
  ): Promise<Message> =>
    request(`/chats/${chatId}/messages`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  listMessages: (chatId: string): Promise<Message[]> =>
    request(`/chats/${chatId}/messages`),
};

// For convenience allow importing individual helpers as named exports
export const {
  createChat,
  listChats,
  getChat,
  updateChat,
  deleteChat,
  cancelRequest,
  sendMessage,
  listMessages,
} = ChatsApi;
