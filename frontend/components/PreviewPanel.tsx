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

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', background: '#111' }}>
      {url ? (
        <iframe title="Preview" src={url} style={{ border: 'none', width: '100%', height: '100%', background: '#fff' }} />
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ddd', height: '100%' }}>
          {showSpinner ? 'Starting dev server…' : (status === 'error' ? 'Dev server failed to start.' : 'No preview available')}
        </div>
      )}

      <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 8 }}>
        <button onClick={onReload} style={{ padding: '6px 10px', fontSize: 12, borderRadius: 4, border: '1px solid #333', background: '#222', color: '#ddd' }}>Reload</button>
        <button onClick={onOpenNewTab} style={{ padding: '6px 10px', fontSize: 12, borderRadius: 4, border: '1px solid #333', background: '#222', color: '#ddd' }}>Open in new tab</button>
      </div>
    </div>
  );
};

export default PreviewPanel;

