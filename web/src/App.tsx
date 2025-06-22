import { Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import SignInPage from './pages/SignInPage';
import { ChatProvider } from './context/ChatContext';
import { ProfilesProvider } from './context/ProfilesContext';
import { ConsensusProvider } from './context/ConsensusContext';

function App() {
  return (
    <ProfilesProvider>
      <ConsensusProvider>
      <ChatProvider>
        <Routes>
              <Route path="/signin" element={<SignInPage />} />
              {/* Catch-all route for the main application, including settings paths */}
              <Route path="/*" element={<AppLayout />} />
            </Routes>
      </ChatProvider>
      </ConsensusProvider>
    </ProfilesProvider>
  );
}

export default App;
