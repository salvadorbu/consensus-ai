import { request } from './request';

export type ChannelStatus = 'pending' | 'running' | 'finished' | 'error';

export interface CreateChannelDto {
  task: string;
  guiding_model: string;
  participant_models: string[];
  max_rounds?: number;
  chat_id?: string;
}

export interface ChannelCreateResponse { channel_id: string; }

export interface ChannelStatusResponse {
  status: ChannelStatus;
  rounds_executed: number;
  answer?: string | null;
  error?: string;
  log?: Record<string, { role: string; content: string }[]>;
}

export const ChannelsApi = {
  createChannel: (data: CreateChannelDto): Promise<ChannelCreateResponse> =>
    request('/channels', { method: 'POST', body: JSON.stringify(data) }),

  getChannelStatus: (channelId: string): Promise<ChannelStatusResponse> =>
    request(`/channels/${channelId}`),
};

export const { createChannel, getChannelStatus } = ChannelsApi;
