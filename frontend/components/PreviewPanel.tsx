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
        <div style={{ 
          width: '100%', 
          height: '100%', 
          background: '#111', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          flexDirection: 'column',
          color: '#e5e7eb',
          textAlign: 'center',
          padding: '2rem'
        }}>
          <div style={{ maxWidth: '400px' }}>
            <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem', color: '#f3f4f6' }}>
              No Preview Available
            </h2>
            <p style={{ fontSize: '1rem', marginBottom: '1.5rem', opacity: 0.8, lineHeight: '1.5' }}>
              To see your project preview, run your development server through the terminal.
            </p>
            <div style={{ 
              background: '#1f2937', 
              border: '1px solid #374151', 
              borderRadius: '8px', 
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: '#9ca3af' }}>
                Common commands to start your project:
              </p>
              <div style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                <div style={{ color: '#10b981', marginBottom: '0.25rem' }}>npm start</div>
                <div style={{ color: '#10b981', marginBottom: '0.25rem' }}>npm run dev</div>
                <div style={{ color: '#10b981', marginBottom: '0.25rem' }}>yarn start</div>
                <div style={{ color: '#10b981' }}>yarn dev</div>
              </div>
            </div>
            <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
              Switch to the Terminal tab to run these commands
            </p>
          </div>
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
    </div>
  );
};

export default PreviewPanel;
