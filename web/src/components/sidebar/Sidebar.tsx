import React from 'react';
import { PlusCircle, Settings, LogOut, ChevronRight, ChevronLeft } from 'lucide-react';
import ChatHistory from './ChatHistory';
import { useChatContext } from '../../context/ChatContext';

interface SidebarProps {
  closeSidebar: () => void;
  isCollapsed?: boolean;
  toggleCollapsed?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ closeSidebar, isCollapsed = false, toggleCollapsed }) => {
  const { startNewChat } = useChatContext();

  const handleNewChat = () => {
    startNewChat();
    closeSidebar();
  };

  return (
    <div className="h-full flex flex-col bg-gray-800 border-r border-gray-700 relative">
      {/* Toggle sidebar button */}
      {toggleCollapsed && (
        <button
          onClick={toggleCollapsed}
          className={`absolute ${isCollapsed ? '-right-3' : 'right-2 top-2'} ${isCollapsed ? 'top-4' : ''} p-1 rounded-full bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white transition-colors z-20`}
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      )}
      {/* Logo and new chat button */}
      <div className={`p-4 ${isCollapsed ? 'flex flex-col items-center' : ''}`}>
        <h1 className="text-xl font-bold mb-4 text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-600">
          {isCollapsed ? 'C' : 'ConsensusAI'}
        </h1>
        <button
          onClick={handleNewChat}
          className="w-full py-2 px-3 flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white font-medium transition-all duration-200"
          title="New Chat"
        >
          <PlusCircle size={18} />
          {!isCollapsed && <span>New Chat</span>}
        </button>
      </div>

      {/* Chat history section */}
      <div className={`flex-1 overflow-y-auto py-2 ${isCollapsed ? 'px-1' : 'px-3'}`}>
        {!isCollapsed && (
          <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-2 px-2">
            Recent Conversations
          </h2>
        )}
        <ChatHistory closeSidebar={closeSidebar} isCollapsed={isCollapsed} />
      </div>

      {/* Sidebar footer */}
      <div className="p-4 border-t border-gray-700">
        <div className={`flex ${isCollapsed ? 'flex-col space-y-4' : 'justify-around'}`}>
          <button 
            className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Settings"
          >
            <Settings size={20} />
          </button>
          <button 
            className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;