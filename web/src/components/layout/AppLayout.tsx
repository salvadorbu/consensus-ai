import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';
import ChatContainer from '../chat/ChatContainer';
import { PanelLeft } from 'lucide-react';
import SettingsModal from '../settings/SettingsModal';

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Settings modal is now derived from the URL (any path that starts with /settings)
  const settingsOpen = location.pathname.startsWith('/settings');

  // Initialize sidebar state based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };
    
    // Set initial state
    handleResize();
    
    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Clean up
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Mobile / Desktop sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="fixed z-20 top-4 left-4 p-2 rounded-md bg-transparent text-gray-200 hover:bg-gray-700/40 transition-colors"
        aria-label="Toggle sidebar"
      >
        <PanelLeft size={20} />
      </button>
      
      {/* Sidebar */}
      <div
        className={`fixed z-10 h-full transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } w-64`}
      >
        <Sidebar />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatContainer onOpenSettings={() => navigate('/settings/profile')} />
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[5] lg:hidden"
        ></div>
      )}
      {/* Settings Modal */}
      <SettingsModal open={settingsOpen} onClose={() => navigate('/')} />
    </div>
  );
};

export default AppLayout;
