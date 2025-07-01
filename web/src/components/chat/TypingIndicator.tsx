import React from 'react';

/**
 * A simple three-dot "typing" indicator shown while waiting for the first
 * streamed tokens from the assistant. Disappears once content arrives.
 */
const TypingIndicator: React.FC = () => (
  <div className="w-full flex justify-start">
    <div className="w-full flex justify-center">
      <div className="max-w-4xl w-full flex">
        <div className="bg-transparent p-3 mb-2 text-white flex space-x-1">
          {/* three animated dots */}
          <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  </div>
);

export default TypingIndicator;
