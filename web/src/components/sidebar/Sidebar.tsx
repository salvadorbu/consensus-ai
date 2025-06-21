import React from 'react';
import { SquarePen, LogIn, UserCircle, ChevronRight, ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ChatHistory from './ChatHistory';
import { useChatContext } from '../../context/ChatContext';
import logo from '../../assets/logo.svg';

interface SidebarProps {
  closeSidebar: () => void;
  isCollapsed?: boolean;
  toggleCollapsed?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ closeSidebar, isCollapsed = false, toggleCollapsed }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { selectChat } = useChatContext();

  const handleNewChat = () => {
    selectChat(''); // empty string resets to welcome view
    closeSidebar();
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700 relative">
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
        <div className="flex items-center justify-center mb-4">
          {isCollapsed ? (
            <img src={logo} alt="ConsensusAI logo" className="h-6 w-6" />
          ) : (
            <h1 className="text-xl font-bold text-blue-600 drop-shadow-[0_0_6px_#2563eb]">
              ConsensusAI
            </h1>
          )}
        </div>
        <button
          onClick={handleNewChat}
          className={`flex items-center justify-center gap-2 transition-all duration-200 focus:outline-none ${isCollapsed ? 'p-0 rounded-full' : 'w-full py-2 px-3 rounded-md'} bg-blue-600 hover:bg-blue-700 text-white drop-shadow-[0_0_6px_#2563eb]`}
          title="New Chat"
        >
          <SquarePen size={isCollapsed ? 24 : 18} />
          {!isCollapsed && <span className="font-medium">New Chat</span>}
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
        <div className={`flex ${isCollapsed ? 'flex-col items-center space-y-4' : 'justify-center'}`}>
          <button
            onClick={() => {
              if (isAuthenticated) {
                navigate('/profile');
              } else {
                navigate('/signin');
              }
              closeSidebar();
            }}
            className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors"
            title={isAuthenticated ? 'Profile' : 'Sign In'}
          >
            {isAuthenticated ? <UserCircle size={20} /> : <LogIn size={20} />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;