import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { AIModel } from '../types';

// -----------------------------------------------------------------------------
// Consensus settings context (guiding + participant agent models)
// -----------------------------------------------------------------------------

interface ConsensusContextType {
  guidingModel: AIModel | null;
  participantModels: (AIModel | null)[];
  setGuidingModel: (model: AIModel | null) => void;
  setParticipantModels: (models: (AIModel | null)[]) => void;
}

const ConsensusContext = createContext<ConsensusContextType | undefined>(undefined);

const STORAGE_KEY = 'consensus_settings_v1';

export const ConsensusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [guidingModel, setGuidingModel] = useState<AIModel | null>(null);
  const [participantModels, setParticipantModels] = useState<(AIModel | null)[]>([]);

  // Load persisted settings on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.guidingModel) setGuidingModel(parsed.guidingModel);
        if (Array.isArray(parsed.participantModels)) setParticipantModels(parsed.participantModels);
      }
    } catch {
      /* ignore malformed localStorage */
    }
  }, []);

  // Persist settings whenever they change
  useEffect(() => {
    try {
      const data = JSON.stringify({ guidingModel, participantModels });
      localStorage.setItem(STORAGE_KEY, data);
    } catch {
      /* ignore */
    }
  }, [guidingModel, participantModels]);

  const value: ConsensusContextType = {
    guidingModel,
    participantModels,
    setGuidingModel,
    setParticipantModels,
  };

  return (
    <ConsensusContext.Provider value={value}>{children}</ConsensusContext.Provider>
  );
};

export const useConsensusSettings = (): ConsensusContextType => {
  const ctx = useContext(ConsensusContext);
  if (!ctx) throw new Error('useConsensusSettings must be used within ConsensusProvider');
  return ctx;
};
