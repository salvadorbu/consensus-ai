import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  listProfiles,
  createProfile as apiCreateProfile,
  updateProfile as apiUpdateProfile,
  deleteProfile as apiDeleteProfile,
  type ConsensusProfile,
  type ProfileCreateDto,
  type ProfileUpdateDto,
} from '../api/profiles';
import { useAuth } from './AuthContext';

interface ProfilesContextType {
  profiles: ConsensusProfile[];
  selectedProfileId: string | null;
  selectProfile: (id: string | null) => void;
  createProfile: (data: ProfileCreateDto) => Promise<void>;
  updateProfile: (id: string, data: ProfileUpdateDto) => Promise<void>;
  deleteProfile: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const ProfilesContext = createContext<ProfilesContextType | undefined>(undefined);

export const ProfilesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();

  const [profiles, setProfiles] = useState<ConsensusProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  const loadProfiles = async () => {
    if (!isAuthenticated) {
      setProfiles([]);
      setSelectedProfileId(null);
      return;
    }
    try {
      const data = await listProfiles();
      setProfiles(data);
      if (data.length && !selectedProfileId) {
        setSelectedProfileId(data[0].id);
      } else if (selectedProfileId && !data.some(p => p.id === selectedProfileId)) {
        setSelectedProfileId(data[0]?.id ?? null);
      }
    } catch (err) {
      console.error('Failed to load profiles', err);
    }
  };

  // Load on mount and whenever auth status changes
  useEffect(() => {
    void loadProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const createProfile = async (data: ProfileCreateDto) => {
    const created = await apiCreateProfile(data);
    setProfiles(prev => [created, ...prev]);
    setSelectedProfileId(created.id);
  };

  const updateProfile = async (id: string, data: ProfileUpdateDto) => {
    const updated = await apiUpdateProfile(id, data);
    setProfiles(prev => prev.map(p => (p.id === id ? updated : p)));
  };

  const deleteProfile = async (id: string) => {
    await apiDeleteProfile(id);
    setProfiles(prev => prev.filter(p => p.id !== id));
    if (selectedProfileId === id) setSelectedProfileId(null);
  };

  const value: ProfilesContextType = {
    profiles,
    selectedProfileId,
    selectProfile: setSelectedProfileId,
    createProfile,
    updateProfile,
    deleteProfile,
    reload: loadProfiles,
  };

  return <ProfilesContext.Provider value={value}>{children}</ProfilesContext.Provider>;
};

export const useProfiles = (): ProfilesContextType => {
  const ctx = useContext(ProfilesContext);
  if (!ctx) throw new Error('useProfiles must be used within ProfilesProvider');
  return ctx;
};
