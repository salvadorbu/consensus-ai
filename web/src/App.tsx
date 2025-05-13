import React from 'react';
import AppLayout from './components/layout/AppLayout';
import { ChatProvider } from './context/ChatContext';
import { ConsensusProvider } from './context/ConsensusContext';

function App() {
  return (
    <ConsensusProvider>
      <ChatProvider>
        <AppLayout />
      </ChatProvider>
    </ConsensusProvider>
  );
}

export default App;