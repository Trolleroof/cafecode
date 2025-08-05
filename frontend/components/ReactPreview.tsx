'use client';

import React from 'react';

interface ReactPreviewProps {
  port?: number;
}

export default function ReactPreview({ port = 3000 }: ReactPreviewProps) {
  return (
    <div className="h-full bg-white">
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
        <span className="text-sm font-medium text-gray-700">React Preview (localhost:{port})</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
      </div>
      <iframe
        src={`http://localhost:${port}`}
        className="w-full h-full border-0"
        title="React Preview"
        sandbox="allow-scripts allow-same-origin"
      />
    </div>
  );
} 