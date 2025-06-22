import React from 'react';
import { useProfiles } from '../../context/ProfilesContext';

interface ProfileSelectorProps {
  className?: string;
}

/** Dropdown that lets the user pick a ConsensusProfile or "Ad-hoc" (none). */
const ProfileSelector: React.FC<ProfileSelectorProps> = ({ className }) => {
  const { profiles, selectedProfileId, selectProfile } = useProfiles();

  return (
    <select
      className={`bg-gray-700 text-gray-200 text-sm rounded-md px-2 py-1 outline-none ${className ?? ''}`}
      value={selectedProfileId ?? (profiles[0]?.id ?? '')}
      onChange={e => {
        const id = e.target.value;
        selectProfile(id);
      }}
    >
            {profiles.map(p => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
};

export default ProfileSelector;
