import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { User, CreditCard, Settings as SettingsIcon, Layers, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ModelSelector from '../chat/ModelSelector';
import { useConsensusSettings } from '../../context/ConsensusContext';
import { useProfiles } from '../../context/ProfilesContext';
import { Plus, Edit2 } from 'lucide-react';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const sectionList = [
  { key: 'user', label: 'Profile', icon: <User size={18} className="inline-block mr-2" /> },
  { key: 'general', label: 'General', icon: <SettingsIcon size={18} className="inline-block mr-2" /> },
  { key: 'consensus', label: 'Consensus', icon: <Layers size={18} className="inline-block mr-2" /> },
  { key: 'billing', label: 'Billing', icon: <CreditCard size={18} className="inline-block mr-2" /> },
];

const ProfileSection: React.FC = () => {
  const {
    profiles,
    selectedProfileId,
    selectProfile,
    createProfile,
    updateProfile,
    deleteProfile,
  } = useProfiles();

  const { guidingModel, participantModels } = useConsensusSettings();

  const [creating, setCreating] = React.useState(false);
  const [newName, setNewName] = React.useState('');

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    try {
      await createProfile({
        name: trimmed,
        guiding_model: guidingModel?.id || 'gpt-4o',
        participant_models: participantModels
          .filter((m): m is import('../../types').AIModel => m !== null)
          .map(m => m.id),
        max_rounds: 6,
      });
      setNewName('');
      setCreating(false);
    } catch (err) {
      console.error('Create profile failed', err);
    }
  };

  return (
    <div className="mb-8">
      <h4 className="text-base font-semibold mb-2 text-gray-100">Saved Profiles</h4>
      <div className="space-y-2">
        
        {profiles.map(p => (
          <div key={p.id} className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                checked={selectedProfileId === p.id}
                onChange={() => selectProfile(p.id)}
              />
              <span>{p.name}</span>
            </label>
            <div className="flex items-center gap-2">
              <button
                className="p-1 text-gray-400 hover:text-white"
                onClick={() => {
                  const newName = prompt('Rename profile', p.name);
                  if (newName && newName.trim()) {
                    void updateProfile(p.id, { name: newName.trim() });
                  }
                }}
                title="Rename"
              >
                <Edit2 size={14} />
              </button>
              <button
                className="p-1 text-red-500 hover:text-red-400"
                onClick={() => {
                  if (confirm('Delete profile?')) void deleteProfile(p.id);
                }}
                title="Delete"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
      {creating ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            className="flex-1 px-2 py-1 rounded bg-gray-800 border border-gray-700 text-sm"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Profile name"
          />
          <button
            className="px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-sm"
            onClick={handleCreate}
          >
            Save
          </button>
          <button
            className="px-3 py-1 rounded bg-gray-700 text-sm"
            onClick={() => setCreating(false)}
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          className="mt-3 flex items-center gap-1 text-blue-500 hover:text-blue-400 text-sm"
          onClick={() => setCreating(true)}
        >
          <Plus size={14} /> Add new profile
        </button>
      )}
    </div>
  );
};

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const { user, deleteAccount } = useAuth();
  const { selectedProfileId, updateProfile } = useProfiles();
  const navigate = useNavigate();
  const location = useLocation();
  type SectionKey = 'user' | 'general' | 'consensus' | 'billing';
  const segment = location.pathname.split('/')[2] || 'profile';
  const selectedSection: SectionKey = segment === 'profile' ? 'user' : (segment as SectionKey);
  const {
    guidingModel: selectedGuidingModel,
    participantModels,
    setGuidingModel: setSelectedGuidingModel,
    setParticipantModels,
  } = useConsensusSettings();
  

  if (!open) return null;

  return (
    <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 animate-in"
        onClick={onClose}
      >
      <div
        className="relative w-full sm:max-w-lg md:max-w-3xl lg:max-w-5xl h-[90vh] md:h-[85vh] lg:h-[80vh] mx-4 rounded-2xl p-0 shadow-2xl border-2 border-blue-500 bg-gray-900 overflow-hidden"
        onClick={e => e.stopPropagation()}
        style={{
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        }}
      >

        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 h-2 w-full animate-gradient" />
        <button
          className="absolute top-3 right-3 text-gray-400 hover:text-white focus:outline-none"
          onClick={onClose}
          aria-label="Close settings"
        >
          <span className="text-2xl">&times;</span>
        </button>
        <div className="p-10 pt-8 bg-gray-900 rounded-2xl text-gray-100 h-full overflow-y-auto text-[1.13rem]" style={{ maxHeight: 'calc(100% - 32px)' }}>
          <h2 className="text-2xl font-bold mb-2 text-gray-100">Settings</h2>
          <hr className="mb-6 border-t-2 border-gray-800" />
          <div className="flex flex-row gap-10">
            <div className="flex flex-col min-w-[160px] pr-8 border-r border-gray-800">
              {sectionList.map((section) => (
                <button
                  key={section.key}
                  className={`w-full py-2 px-4 mb-2 rounded-md text-left font-medium text-base flex items-center transition-colors
                    ${selectedSection === section.key
                      ? 'bg-blue-700 text-white shadow'
                      : 'bg-transparent text-gray-300 hover:bg-gray-800 hover:text-white'}
                  `}
                  onClick={() => {
                      const segment = section.key === 'user' ? 'profile' : section.key;
                      navigate(`/settings/${segment}`);
                    }}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </div>
            <div className="flex-1">
              {selectedSection === 'user' && (
                <section>
                  <h3 className="text-lg font-semibold mb-2 text-gray-100 flex items-center"><User size={18} className="inline-block mr-2" />Profile</h3>
                  {user ? (
                    <div className="space-y-4">
                      <p>Email: <span className="text-blue-400">{user.email}</span></p>
                      <p>Joined: {new Date(user.created_at).toLocaleDateString()}</p>
                      <button
                        className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-sm"
                        onClick={() => {
                          if (confirm('Delete account? This action is irreversible.')) {
                            void deleteAccount().then(() => navigate('/'));
                          }
                        }}
                      >
                        Delete Account
                      </button>
                    </div>
                  ) : (
                    <div className="text-gray-400">Not logged in.</div>
                  )}
                </section>
              )}
              {selectedSection === 'billing' && (
                <section>
                  <h3 className="text-lg font-semibold mb-2 text-gray-100 flex items-center"><CreditCard size={18} className="inline-block mr-2" />Billing</h3>
                  <div className="text-gray-400">(Coming soon: manage billing and payment methods.)</div>
                </section>
              )}
              {selectedSection === 'general' && (
                <section>
                  <h3 className="text-lg font-semibold mb-2 text-gray-100 flex items-center"><SettingsIcon size={18} className="inline-block mr-2" />General</h3>
                  {/* Empty for now */}
                </section>
              )}
              {selectedSection === 'consensus' && (
                <section>
                  <h3 className="text-lg font-semibold mb-4 text-gray-100 flex items-center"><Layers size={18} className="inline-block mr-2" />Consensus</h3>

                  <ProfileSection />

                  <hr className="my-6 border-gray-700" />

                  <div className="space-y-6">
                    <div className="mb-6 pb-6 border-b border-gray-700">
                      <h4 className="text-base font-semibold mb-2 text-gray-100">Guiding Agent</h4>
                      <div className="mb-2 text-gray-400 text-sm">Configure the guiding agent when no profile is selected.</div>
                      <ModelSelector
                        value={selectedGuidingModel}
                        onChange={m => {
                          setSelectedGuidingModel(m);
                          if (selectedProfileId && m) {
                            void updateProfile(selectedProfileId, { guiding_model: m.id });
                          }
                        }}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-semibold text-gray-100">Participants</h4>
                        <button
                          className={`ml-2 px-3 py-1.5 rounded-full border border-blue-500 text-blue-500 text-sm font-semibold bg-transparent hover:border-blue-400 hover:text-blue-400 disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all`}
                          onClick={() => {
                            if (participantModels.length < 5) {
                              const updated = [...participantModels, null];
                              setParticipantModels(updated);
                              // do NOT persist until user selects a model
                            }
                          }}
                          disabled={participantModels.length >= 5}
                          type="button"
                          aria-label="Add participant"
                        >
                          Add
                        </button>
                      </div>
                      <div className="flex flex-col gap-2">
                        {participantModels.map((model, idx) => (
                          <div key={idx} className="flex items-center gap-2 w-full justify-between">
                            <ModelSelector
                              value={model}
                              onChange={m => {
                                 const newModels = [...participantModels];
                                 newModels[idx] = m;
                                 setParticipantModels(newModels);
                                 if (selectedProfileId && m) {
                                   void updateProfile(selectedProfileId, {
                                     participant_models: newModels
                                       .filter((x): x is import('../../types').AIModel => x !== null)
                                       .map(x => x.id),
                                   });
                                 }
                               }}
                            />
                            <button
                              className="px-2 py-1.5 rounded-full border border-red-500 text-red-500 bg-transparent hover:border-red-400 hover:text-red-400 disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                              onClick={() => {
                                const updated = participantModels.filter((_, i) => i !== idx);
                                setParticipantModels(updated);
                                if (selectedProfileId) {
                                  void updateProfile(selectedProfileId, {
                                    participant_models: updated
                                      .filter((x): x is import('../../types').AIModel => x !== null)
                                      .map(x => x.id),
                                  });
                                }
                              }}
                              type="button"
                              aria-label="Remove participant"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
