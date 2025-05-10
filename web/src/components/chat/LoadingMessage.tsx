import React from 'react';

const LoadingMessage: React.FC = () => (
  <div className="flex items-center justify-center py-8">
    <div className="flex flex-row items-center space-x-2">
      <svg className="animate-spin h-6 w-6 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
      </svg>
      <span className="text-gray-400 text-base">Waiting for model response...</span>
    </div>
  </div>
);

export default LoadingMessage;
