import React from 'react';

const TypingIndicator = () => {
  return (
    <div className="flex items-center space-x-1 p-2">
      <div className="w-2 h-2 bg-medium-coffee rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
      <div className="w-2 h-2 bg-medium-coffee rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
      <div className="w-2 h-2 bg-medium-coffee rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
    </div>
  );
};

export default TypingIndicator; 