import React from 'react';
import AppLayout from './components/layout/AppLayout';
import { ChatProvider } from './context/ChatContext';

function App() {
  return (
    <ChatProvider>
      <AppLayout />
    </ChatProvider>
  );
}

export default App;