import React from 'react';
import { Message } from '../../types';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';



interface ChatMessagesProps {
  messages: Message[];
}

const ChatMessages: React.FC<ChatMessagesProps> = ({ messages }) => {
  const lastMsg = messages[messages.length - 1];
  const typing = lastMsg && lastMsg.role === 'assistant' && lastMsg.content === '';
  const visibleMessages = typing ? messages.slice(0, -1) : messages;




  return (
    <div className="space-y-6">
      {visibleMessages.map((message, index) => (
        <MessageBubble key={index} message={message} />
      ))}
      {typing && <TypingIndicator />}
    </div>
  );
};

export default ChatMessages;