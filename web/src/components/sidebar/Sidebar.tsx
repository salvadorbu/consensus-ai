import React from 'react';
import ReactDOM from 'react-dom';
import { SquarePen, LogIn, UserCircle, LogOut, ChevronRight, ChevronLeft } from 'lucide-react';
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
  const { isAuthenticated, logout } = useAuth();
  const { selectChat } = useChatContext();

  // State to handle profile popover visibility and position
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  const [menuPos, setMenuPos] = React.useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const profileBtnRef = React.useRef<HTMLButtonElement | null>(null);

  // Close menu when clicking outside
  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (!showProfileMenu) return;
      const target = e.target as Node;
      if (profileBtnRef.current && !profileBtnRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, [showProfileMenu]);

  const toggleProfileMenu = () => {
    if (profileBtnRef.current) {
      const rect = profileBtnRef.current.getBoundingClientRect();
      // Position the menu slightly above and to the right of the button (main content area)
      setMenuPos({ top: rect.top - 90, left: rect.left + (rect.width / 2) - 88 });
    }
    setShowProfileMenu(prev => !prev);
  };
  

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
            ref={profileBtnRef}
            onClick={() => {
              if (!isAuthenticated) {
                navigate('/signin');
                closeSidebar();
                return;
              }
              toggleProfileMenu();
            }}
            className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors relative"
            title={isAuthenticated ? 'Profile' : 'Sign In'}
          >
            {isAuthenticated ? <UserCircle size={20} /> : <LogIn size={20} />}
          </button>

          {/* Profile popover */}
          {showProfileMenu && (
            ReactDOM.createPortal(
              <div
                className="fixed z-50 bg-gray-800 text-gray-200 border border-gray-700 rounded-md shadow-lg w-44"
                style={{ top: menuPos.top, left: menuPos.left }}
              >
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors"
                  onClick={() => {
                    navigate('/settings/profile');
                    setShowProfileMenu(false);
                    closeSidebar();
                  }}
                >
                  Settings
                </button>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                    closeSidebar();
                    navigate('/');
                  }}
                >
                  <LogOut size={16} /> Logout
                </button>
              </div>,
              document.body
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;