import React from 'react';
import { Message } from '../../types';
import MessageBubble from './MessageBubble';
import LoadingMessage from './LoadingMessage';
import { useChatContext } from '../../context/ChatContext';

interface ChatMessagesProps {
  messages: Message[];
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  const { loading } = useChatContext();

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Start a conversation by typing a message below.</p>
      </div>
    );
  }

  const lastMsg = messages[messages.length - 1];
  const waitingForBot = loading && lastMsg && lastMsg.role === 'user';

  return (
    <div className="space-y-6">
      {messages.map((message, index) => (
        <MessageBubble key={index} message={message} />
      ))}
      {waitingForBot && <LoadingMessage />}
    </div>
  );
};

export default ChatMessages;