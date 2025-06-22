import React, {
  
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import { useProfiles } from './ProfilesContext';
import { AIModel } from '../types';

// -----------------------------------------------------------------------------
// Consensus settings context (guiding + participant agent models)
// -----------------------------------------------------------------------------

interface ConsensusContextType {
  // Currently selected profile OR manual settings
  selectedProfileId: string | null;
  selectProfile: (id: string | null) => void;

  guidingModel: AIModel | null;
  participantModels: (AIModel | null)[];
  setGuidingModel: (model: AIModel | null) => void;
  setParticipantModels: (models: (AIModel | null)[]) => void;
}

const ConsensusContext = createContext<ConsensusContextType | undefined>(undefined);



export const ConsensusProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { profiles, selectedProfileId, selectProfile } = useProfiles();
  const [guidingModel, setGuidingModel] = useState<AIModel | null>(null);
  const [participantModels, setParticipantModels] = useState<(AIModel | null)[]>([]);

  

  // Derive overrides from selected profile if any
  useEffect(() => {
    if (!selectedProfileId) return;
    const prof = profiles.find(p => p.id === selectedProfileId);
    if (prof) {
      setGuidingModel({ id: prof.guiding_model, name: prof.guiding_model, description: '' });
      setParticipantModels(
        prof.participant_models.map(m => ({ id: m, name: m, description: '' })) as AIModel[],
      );
    }
  }, [selectedProfileId, profiles]);

  

  const value: ConsensusContextType = {
    selectedProfileId,
    selectProfile,
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
