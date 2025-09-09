'use client';

import React, { useEffect, useMemo, useState } from 'react';

interface ReactPreviewProps {
  port?: number;
}

// Backend base for preview proxy. Matches Terminal WS backend host.
const BACKEND_HTTP_BASE = 'https://cafecode-backend-v2.fly.dev';

type PreviewStatus = 'checking' | 'ready' | 'unreachable';

const ReactPreview: React.FC<ReactPreviewProps> = ({ port = 3000 }) => {
  const previewUrl = useMemo(() => `${BACKEND_HTTP_BASE}/preview/${port}/`, [port]);
  const [status, setStatus] = useState<PreviewStatus>('checking');
  const [lastCheckedAt, setLastCheckedAt] = useState<number>(Date.now());

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const check = async () => {
      setStatus('checking');
      try {
        const res = await fetch(previewUrl, {
          method: 'HEAD',
          mode: 'cors',
          signal: controller.signal,
        });
        if (!cancelled && res.ok) {
          setStatus('ready');
        } else if (!cancelled) {
          setStatus('unreachable');
        }
      } catch (_) {
        if (!cancelled) setStatus('unreachable');
      }
    };
    check();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [previewUrl, lastCheckedAt]);

  const retry = () => setLastCheckedAt(Date.now());

  return (
    <div className="h-full bg-white">
      <div className="flex items-center justify-between p-2 bg-gray-100 border-b">
        <span className="text-sm font-medium text-gray-700">React Preview (proxy port {port})</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-red-500 rounded-full"></div>
          <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
        </div>
      </div>
      <div className="w-full h-full relative">
        {status === 'ready' && (
          <iframe
            // Route through backend preview proxy so cloud terminals are reachable
            src={previewUrl}
            className="w-full h-full border-0"
            title="React Preview"
            sandbox="allow-scripts allow-same-origin"
          />
        )}

        {status !== 'ready' && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
            <div className="text-center max-w-md px-6">
              <div className="text-gray-800 font-medium mb-2">
                {status === 'checking' ? 'Checking preview server…' : 'Preview server not reachable'}
              </div>
              <div className="text-gray-600 text-sm mb-4">
                {status === 'checking' ? (
                  'One moment while we check if your dev server is running.'
                ) : (
                  'Start your Vite dev server in the IDE terminal so the preview can load.'
                )}
              </div>
              <div className="bg-gray-900 text-gray-100 text-xs rounded-md p-3 text-left font-mono mb-3">
                npm run dev -- --port {port}
              </div>
              <div className="bg-gray-900 text-gray-100 text-xs rounded-md p-3 text-left font-mono mb-4">
                pnpm dev --port {port}
              </div>
              <div className="text-gray-500 text-xs mb-2">
                Tip: If needed, add <span className="font-mono">--strictPort</span> to avoid automatic port changes.
              </div>
              <button
                onClick={retry}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReactPreview; 
