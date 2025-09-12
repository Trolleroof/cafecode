"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { buildService } from '@/services/BuildService';
import { devServerManager } from '@/services/DevServerManager';

const BuildPanel: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'building' | 'success' | 'failed'>('idle');

  useEffect(() => {
    const off = buildService.watch((s, l) => { setStatus(s); setLogs(l); });
    return () => { off(); };
  }, []);

  const color = useMemo(() => ({ idle: '#9ca3af', building: '#f59e0b', success: '#10b981', failed: '#ef4444' }[status]), [status]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', gap: 8, padding: 8, borderBottom: '1px solid #e5e7eb', background: '#fafafa' }}>
        <button onClick={() => buildService.runBuild()} style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', fontSize: 12 }}>Run Build</button>
        <button onClick={() => devServerManager.start(['npm', 'run', 'preview'])} style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', fontSize: 12 }}>Run Preview Server</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 8, height: 8, background: color, borderRadius: 9999 }} />
          <span style={{ fontSize: 12, color: '#111827' }}>{status.toUpperCase()}</span>
        </div>
      </div>
      <pre style={{ flex: 1, margin: 0, padding: 12, background: '#0b0f19', color: '#d1d5db', overflow: 'auto', fontSize: 12, lineHeight: 1.5 }}>
        {logs.map((line, i) => {
          const isErr = /\b(error|failed|exception)\b/i.test(line);
          const isWarn = /\b(warn|deprecate)\b/i.test(line);
          const style = { color: isErr ? '#f87171' : (isWarn ? '#fbbf24' : '#d1d5db') } as React.CSSProperties;
          return <div key={i} style={style}>{line}</div>;
        })}
      </pre>
    </div>
  );
};

export default BuildPanel;

