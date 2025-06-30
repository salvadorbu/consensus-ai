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