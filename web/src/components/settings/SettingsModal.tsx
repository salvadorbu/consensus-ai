import React, { useState } from 'react';
import { User, CreditCard, Settings as SettingsIcon, Layers, Trash2 } from 'lucide-react';
import DropdownModelSelector from './DropdownModelSelector';
import { useConsensusSettings } from '../../context/ConsensusContext';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

const sectionList = [
  { key: 'general', label: 'General', icon: <SettingsIcon size={18} className="inline-block mr-2" /> },
  { key: 'consensus', label: 'Consensus', icon: <Layers size={18} className="inline-block mr-2" /> },
  { key: 'user', label: 'User', icon: <User size={18} className="inline-block mr-2" /> },
  { key: 'billing', label: 'Billing', icon: <CreditCard size={18} className="inline-block mr-2" /> },
];

const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [selectedSection, setSelectedSection] = useState('general');
  const {
    guidingModel: selectedGuidingModel,
    participantModels,
    setGuidingModel: setSelectedGuidingModel,
    setParticipantModels,
  } = useConsensusSettings();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 animate-in">
      <div
        className="relative w-full max-w-[48rem] mx-4 rounded-2xl p-0 shadow-2xl border-2 border-blue-500 bg-gray-900 rounded-2xl"
        style={{
          boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
          minHeight: '700px', // 30-40% taller than before
          height: '820px',    // fixed height for modal
          maxHeight: '90vh',  // prevent overflow on very small screens
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
                  onClick={() => setSelectedSection(section.key)}
                >
                  <span className="mr-2">{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </div>
            <div className="flex-1">
              {selectedSection === 'user' && (
                <section>
                  <h3 className="text-lg font-semibold mb-2 text-gray-100 flex items-center"><User size={18} className="inline-block mr-2" />User</h3>
                  <div className="text-gray-400">(Coming soon: manage your user profile and preferences.)</div>
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
                  <div className="space-y-6">
                    <div className="mb-6 pb-6 border-b border-gray-700">
                      <h4 className="text-base font-semibold mb-2 text-gray-100">Guiding Agent</h4>
                      <div className="mb-2 text-gray-400 text-sm">Configure the guiding agent for consensus rounds.</div>
                      <DropdownModelSelector
                        value={selectedGuidingModel}
                        onChange={setSelectedGuidingModel}
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-base font-semibold text-gray-100">Participants</h4>
                        <button
                          className={`ml-2 px-3 py-1.5 rounded-full border border-blue-500 text-blue-500 text-sm font-semibold bg-transparent hover:border-blue-400 hover:text-blue-400 disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all`}
                          onClick={() => {
                            if (participantModels.length < 5) setParticipantModels([...participantModels, null]);
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
                            <DropdownModelSelector
                              value={model}
                              onChange={m => {
                                const newModels = [...participantModels];
                                newModels[idx] = m;
                                setParticipantModels(newModels);
                              }}
                            />
                            <button
                              className="px-2 py-1.5 rounded-full border border-red-500 text-red-500 bg-transparent hover:border-red-400 hover:text-red-400 disabled:border-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed transition-all flex items-center justify-center"
                              onClick={() => {
                                setParticipantModels(participantModels.filter((_, i) => i !== idx));
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
