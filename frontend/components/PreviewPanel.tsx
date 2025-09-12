"use client";

import React from "react";

type PreviewPanelProps = {
  url?: string;
  status?: 'idle' | 'installing' | 'starting' | 'running' | 'exited' | 'error';
  onOpenNewTab?: () => void;
  onReload?: () => void;
};

const PreviewPanel: React.FC<PreviewPanelProps> = ({ url, status = 'idle', onOpenNewTab, onReload }) => {
  const showSpinner = status === 'installing' || status === 'starting' || (!url && status !== 'error');
  const label = status === 'installing' ? 'Installing dependencies…' : status === 'starting' ? 'Starting dev server…' : status === 'error' ? 'Dev server failed to start.' : (url ? 'Running' : 'No preview available');

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#111' }}>
      {url ? (
        <iframe
          title="Preview"
          src={url}
          style={{ border: 'none', width: '100%', height: '100%', background: '#fff', transition: 'opacity 200ms ease-in-out' }}
          aria-live="polite"
        />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ddd', height: '100%', gap: 12 }} aria-live="polite">
          {showSpinner && (
            <span aria-hidden="true" style={{ width: 14, height: 14, borderRadius: 9999, border: '2px solid #888', borderTopColor: '#fff', animation: 'spin 1s linear infinite' }} />
          )}
          <span>{label}</span>
        </div>
      )}

      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 8 }}>
        <button
          onClick={onReload}
          aria-label="Reload preview"
          style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #374151', background: '#111827', color: '#e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.3)', transition: 'transform 120ms ease, background 120ms ease' }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Reload
        </button>
        <button
          onClick={onOpenNewTab}
          aria-label="Open preview in a new tab"
          style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #374151', background: '#111827', color: '#e5e7eb', boxShadow: '0 1px 2px rgba(0,0,0,0.3)', transition: 'transform 120ms ease, background 120ms ease' }}
          onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
          onMouseUp={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          Open in new tab
        </button>
      </div>

      {/* local keyframes for spinner */}
      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};

export default PreviewPanel;
