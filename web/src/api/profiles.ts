import { request } from './request';

// -----------------------------------------------------------------------------
// DTOs mirroring the FastAPI consensus profile schema
// -----------------------------------------------------------------------------

export interface ConsensusProfile {
  id: string;
  name: string;
  guiding_model: string;
  participant_models: string[];
  max_rounds: number;
  created_at: string;
  updated_at: string;
}

export interface ProfileCreateDto {
  name: string;
  guiding_model: string;
  participant_models: string[];
  max_rounds: number;
}

export interface ProfileUpdateDto {
  name?: string;
  guiding_model?: string;
  participant_models?: string[];
  max_rounds?: number;
}

export const ProfilesApi = {
  listProfiles: (): Promise<ConsensusProfile[]> => request('/profiles'),

  getProfile: (id: string): Promise<ConsensusProfile> => request(`/profiles/${id}`),

  createProfile: (data: ProfileCreateDto): Promise<ConsensusProfile> =>
    request('/profiles', { method: 'POST', body: JSON.stringify(data) }),

  updateProfile: (id: string, data: ProfileUpdateDto): Promise<ConsensusProfile> =>
    request(`/profiles/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  deleteProfile: (id: string): Promise<void> =>
    request<void>(`/profiles/${id}`, { method: 'DELETE' }),
};

export const {
  listProfiles,
  getProfile,
  createProfile,
  updateProfile,
  deleteProfile,
} = ProfilesApi;
