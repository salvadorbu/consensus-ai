import React from 'react';
import ReactDOM from 'react-dom';
import { SquarePen, LogIn, UserCircle, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import ChatHistory from './ChatHistory';
import { useChatContext } from '../../context/ChatContext';

interface SidebarProps {}

const Sidebar: React.FC<SidebarProps> = () => {
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();
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
  };

  return (
    <div className="h-full flex flex-col bg-gray-900 border-r border-gray-700 relative">
      {/* Logo and new chat button */}
      <div className="p-4">
        <div className="flex items-center justify-center mb-4">
          <h1 className="text-xl font-bold text-blue-600 drop-shadow-[0_0_6px_#2563eb]">
            ConsensusAI
          </h1>
        </div>
        <button
          onClick={handleNewChat}
          className="w-full py-2 px-3 flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white drop-shadow-[0_0_6px_#2563eb] transition-all duration-200 focus:outline-none"
          title="New Chat"
        >
          <SquarePen size={18} />
          <span className="font-medium">New Chat</span>
        </button>
      </div>

      {/* Chat history section */}
      <div className="flex-1 overflow-y-auto py-2 px-3">
        <h2 className="text-xs uppercase tracking-wider text-gray-400 mb-2 px-2">
          Recent Conversations
        </h2>
        <ChatHistory />
      </div>

      {/* Sidebar footer */}
      <div className="p-4 border-t border-gray-700">
        <div className="flex justify-center">
          <button
            ref={profileBtnRef}
            onClick={() => {
              if (!isAuthenticated) {
                navigate('/signin');
                return;
              }
              toggleProfileMenu();
            }}
            className="p-2 rounded-md hover:bg-gray-700 text-gray-400 hover:text-white transition-colors relative flex items-center gap-2 pl-3 pr-2"
            title={isAuthenticated ? 'Profile' : 'Sign In'}
          >
            {isAuthenticated ? <UserCircle size={20} /> : <LogIn size={20} />}
            {isAuthenticated && (
              <span className="text-sm max-w-[120px] truncate">{user?.email}</span>
            )}
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
                  }}
                >
                  Settings
                </button>
                <button
                  className="w-full text-left px-4 py-2 hover:bg-gray-700 transition-colors flex items-center gap-2"
                  onClick={() => {
                    logout();
                    setShowProfileMenu(false);
                    navigate('/');
                  }}
                >
                  <LogOut size={16} /> Log out
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