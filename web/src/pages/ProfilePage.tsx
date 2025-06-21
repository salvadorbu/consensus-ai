import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProfilePage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
      <button
        className="absolute top-4 left-4 text-gray-300 hover:text-white"
        onClick={() => navigate('/')}
      >
        &larr; Back to Chat
      </button>

      <div className="w-full max-w-md bg-gray-800 rounded-lg p-8 shadow-md text-center space-y-4">
        <h2 className="text-2xl font-semibold text-blue-500">Profile</h2>
        {user ? (
          <>
            <p>Email: {user.email}</p>
            <button
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 rounded"
              onClick={() => {
                logout();
                navigate('/');
              }}
            >
              Logout
            </button>
          </>
        ) : (
          <p>You are not logged in.</p>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
