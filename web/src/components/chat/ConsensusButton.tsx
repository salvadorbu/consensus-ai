import React from 'react';
import { Layers } from 'lucide-react';

interface ConsensusButtonProps {
  active: boolean;
  onClick: () => void;
}

const ConsensusButton: React.FC<ConsensusButtonProps> = ({ active, onClick }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`
        flex items-center gap-1.5 px-2 py-1.5 rounded-md transition-all duration-200 border
        ${active 
          ? 'bg-purple-600/30 text-purple-300 border-purple-500/30' 
          : 'hover:bg-gray-700 text-gray-400 border-transparent'
        }
      `}
      title="Generate consensus response from multiple models"
    >
      <Layers size={16} />
      <span className="text-sm">Consensus</span>
    </button>
  );
};

export default ConsensusButton;