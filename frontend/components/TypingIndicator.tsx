import React from 'react';

const TypingIndicator = () => {
  return (
    <div className="flex items-center space-x-1 p-2">
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-fast"></div>
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-fast delay-150"></div>
      <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse-fast delay-300"></div>
    </div>
  );
};

export default TypingIndicator; 