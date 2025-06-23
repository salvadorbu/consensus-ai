import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, CheckCircle } from 'lucide-react';
import { useProfiles } from '../../context/ProfilesContext';

interface ProfileSelectorProps {
  className?: string;
}

const ProfileSelector: React.FC<ProfileSelectorProps> = ({ className = '' }) => {
  const { profiles, selectedProfileId, selectProfile } = useProfiles();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentLabel = selectedProfileId
    ? profiles.find(p => p.id === selectedProfileId)?.name ?? 'Profile'
    : 'Select Profile';

  const handleSelect = (id: string) => {
    selectProfile(id);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(o => !o)}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-gray-700 transition-colors"
      >
        <span className="text-sm">{currentLabel}</span>
        <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-2 min-w-[200px] z-10 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
        >
          <div className="p-2 max-h-72 overflow-y-auto flex flex-col gap-1">
            {profiles.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelect(p.id)}
                className={`w-full px-3 py-2 text-left rounded-md flex items-center justify-between hover:bg-gray-700/50 transition-colors ${
                  selectedProfileId === p.id ? 'bg-gray-700' : ''
                }`}
              >
                <span className="text-sm">{p.name}</span>
                {selectedProfileId === p.id && <CheckCircle size={16} className="text-blue-500" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfileSelector;
