import React, { useState, useEffect } from 'react';
import Sidebar from '../sidebar/Sidebar';
import ChatContainer from '../chat/ChatContainer';
import { Menu } from 'lucide-react';

const AppLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  const toggleCollapsed = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* Mobile sidebar toggle */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden fixed z-20 top-4 left-4 p-2 rounded-md bg-gray-800 text-gray-200 hover:bg-gray-700 transition-colors"
        aria-label="Toggle sidebar"
      >
        <Menu size={20} />
      </button>
      
      {/* We'll remove this button as we're moving it to the Sidebar component */}

      {/* Sidebar */}
      <div
        className={`fixed lg:relative z-10 h-full transform transition-all duration-300 ease-in-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${
          sidebarCollapsed ? 'lg:w-16' : 'w-64'
        }`}
      >
        <Sidebar 
          closeSidebar={() => setSidebarOpen(false)} 
          isCollapsed={sidebarCollapsed} 
          toggleCollapsed={toggleCollapsed} 
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <ChatContainer />
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[5] lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
};

export default AppLayout;