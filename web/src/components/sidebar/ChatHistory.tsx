import React from 'react';
import { MessageSquare, Trash2 } from 'lucide-react';
import { useChatContext } from '../../context/ChatContext';

interface ChatHistoryProps {
  closeSidebar: () => void;
  isCollapsed?: boolean;
}

const ChatHistory: React.FC<ChatHistoryProps> = ({ closeSidebar, isCollapsed = false }) => {
  const { chatSessions, activeChatId, selectChat, deleteChat } = useChatContext();

  // Sort sessions by lastUpdated
  const sortedSessions = [...chatSessions].sort(
    (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
  );

  const handleChatClick = (chatId: string) => {
    selectChat(chatId);
    closeSidebar();
  };

  if (sortedSessions.length === 0) {
    return (
      <div className="py-4 text-center text-gray-500 text-sm">
        {isCollapsed ? '' : 'No conversations yet'}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {sortedSessions.map((session) => (
        <div
          key={session.id}
          className={`
            flex items-center justify-between ${isCollapsed ? 'p-1' : 'p-2'} rounded-md cursor-pointer group
            ${activeChatId === session.id ? 'bg-gray-700' : 'hover:bg-gray-700/50'}
            transition-colors duration-150
          `}
          onClick={() => handleChatClick(session.id)}
          title={isCollapsed ? session.title : ''}
        >
          <div className="flex items-center overflow-hidden">
            <MessageSquare size={16} className={`flex-shrink-0 ${isCollapsed ? 'mx-auto' : 'mr-2'} text-gray-400`} />
            {!isCollapsed && <span className="truncate">{session.title}</span>}
          </div>
          {!isCollapsed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteChat(session.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-400 transition-opacity duration-150"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
};

export default ChatHistory;