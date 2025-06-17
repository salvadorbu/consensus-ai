export type ChannelStatus = 'pending' | 'running' | 'finished' | 'error';

// -----------------------------------------------------------------------------
// DTOs & Types mirroring the FastAPI schemas (minimal subset that the frontend
// needs). Field names follow the *snake_case* convention returned by FastAPI
// to avoid any manual mapping on the client.
// -----------------------------------------------------------------------------

export interface CreateChannelDto {
  task: string;
  guiding_model: string;
  participant_models: string[];
  max_rounds?: number;
  chat_id?: string;
}

export interface ChannelCreateResponse {
  channel_id: string;
}

export interface ChannelStatusResponse {
  status: ChannelStatus;
  rounds_executed: number;
  answer?: string | null;
  error?: string;
}

// -----------------------------------------------------------------------------
// Low-level helper around fetch() – duplicated from chats.ts to keep the API
// helpers self-contained for now.
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
      // eslint-disable-next-line @typescript-eslint/dot-notation
      detail = data?.detail ?? res.statusText;
    } catch {
      detail = res.statusText;
    }
    throw new Error(`API ${res.status}: ${detail}`);
  }

  // 204 (No Content)
  if (res.status === 204) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return undefined as unknown as T;
  }

  return res.json() as Promise<T>;
}

// -----------------------------------------------------------------------------
// Public helper functions
// -----------------------------------------------------------------------------

export const ChannelsApi = {
  createChannel: (data: CreateChannelDto): Promise<ChannelCreateResponse> =>
    request('/channels', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getChannelStatus: (channelId: string): Promise<ChannelStatusResponse> =>
    request(`/channels/${channelId}`),
};

// Named exports for convenience -------------------------------------------------
export const { createChannel, getChannelStatus } = ChannelsApi;
