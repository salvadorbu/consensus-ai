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

export interface ChatWithMessages extends Chat {
  messages: Message[];
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
}

// -----------------------------------------------------------------------------
// Low-level helper around fetch()
// -----------------------------------------------------------------------------

const API_BASE_URL =
  (import.meta as any).env?.VITE_API_BASE_URL?.replace(/\/$/, '') ||
  'http://localhost:8000';

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!res.ok) {
    // Attempt to extract error detail from FastAPI response
    let detail: string;
    try {
      const data = await res.json();
      detail = data?.detail ?? res.statusText;
    } catch {
      detail = res.statusText;
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }

  // 204 (No Content) – e.g. DELETE chat
  if (res.status === 204) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

// -----------------------------------------------------------------------------
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
  sendMessage,
  listMessages,
} = ChatsApi;
