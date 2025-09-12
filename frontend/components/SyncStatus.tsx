"use client";

import React, { useEffect, useState } from 'react';
import { synchronizationService, type SyncStatus as TSyncStatus, type Conflict } from '@/services/SynchronizationService';

type Props = {
  compact?: boolean;
};

const colorFor = (s: TSyncStatus) => ({
  idle: '#16a34a',
  syncing: '#f59e0b',
  offline: '#ef4444',
  conflict: '#ef4444',
}[s]);

const labelFor = (s: TSyncStatus) => ({
  idle: 'Synced',
  syncing: 'Syncing…',
  offline: 'Offline',
  conflict: 'Conflicts',
}[s]);

const SyncStatus: React.FC<Props> = ({ compact = true }) => {
  const [status, setStatus] = useState<TSyncStatus>('idle');
  const [pending, setPending] = useState(0);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!synchronizationService) return;
    const off = synchronizationService.onChange((s, p, c) => {
      setStatus(s); setPending(p); setConflicts(c);
    });
    // Initialize once
    void synchronizationService.init();
    return () => { off && off(); };
  }, []);

  const color = colorFor(status);
  const label = labelFor(status);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div
        onClick={() => setOpen(o => !o)}
        title={`${label}${pending ? ` • ${pending} pending` : ''}${conflicts.length ? ` • ${conflicts.length} conflicts` : ''}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer',
          border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px', background: '#fff'
        }}
      >
        <span style={{ width: 8, height: 8, background: color, borderRadius: 9999 }} />
        <span style={{ color: '#111827', fontSize: 12 }}>{label}</span>
        {pending > 0 && <span style={{ color: '#6b7280', fontSize: 12 }}>• {pending} pending</span>}
        {conflicts.length > 0 && <span style={{ color: '#ef4444', fontSize: 12 }}>• {conflicts.length} conflicts</span>}
      </div>

      {open && conflicts.length > 0 && (
        <div style={{ position: 'absolute', top: '3rem', right: '1rem', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, width: 360, zIndex: 30 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Conflicts</div>
          {conflicts.map(c => (
            <div key={c.path} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 12, color: '#374151', marginBottom: 4 }}>{c.path}</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => synchronizationService?.resolveConflict(c.path, 'keep-local')} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', background: '#f9fafb', fontSize: 12 }}>Keep local</button>
                <button onClick={() => synchronizationService?.resolveConflict(c.path, 'keep-remote')} style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db', background: '#f9fafb', fontSize: 12 }}>Keep remote</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SyncStatus;
