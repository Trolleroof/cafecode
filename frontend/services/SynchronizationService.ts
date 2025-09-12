import { webContainerFS } from '@/services/WebContainerFileSystem';
import { getFreshAccessToken } from '@/lib/authToken';
import { supabase } from '@/lib/supabase';

type Op = 'create' | 'update' | 'delete';

export type SyncChange = {
  op: Op;
  path: string;
  isFolder?: boolean;
  content?: string;
  ts: number;
  baseRemoteHash?: string | null; // for conflict detection on updates
};

export type Conflict = {
  path: string;
  localContent?: string;
  remoteContent?: string;
};

export type SyncStatus = 'idle' | 'syncing' | 'offline' | 'conflict';

type Listener = (status: SyncStatus, pending: number, conflicts: Conflict[]) => void;

const QUEUE_KEY = 'wc.sync.queue.v1';
const REMOTE_HASH_KEY = 'wc.sync.hash.v1';
const SEEDED_KEY = 'wc.seed.done';
const isBrowser = typeof window !== 'undefined' && typeof document !== 'undefined';

const IGNORED_SEGMENTS = new Set([
  'node_modules', '.next', 'build', 'dist', 'out', 'coverage', '.turbo', '.cache', '.git', '.svelte-kit', '.nuxt', '.vite'
]);

function isIgnoredPath(p: string): boolean {
  const normalized = p.replace(/^\/+/, '');
  const parts = normalized.split('/');
  return parts.some(seg => IGNORED_SEGMENTS.has(seg)) || normalized.startsWith('.') && !normalized.startsWith('.env');
}

function sha256(input: string): string {
  // Simple browser hash (not crypto-level, good enough for conflicts)
  // Using SubtleCrypto would be async; keep simple with a quick hash
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(31, h) + input.charCodeAt(i) | 0;
  }
  return String(h >>> 0);
}

class SynchronizationService {
  private queue: SyncChange[] = [];
  private status: SyncStatus = 'idle';
  private listeners = new Set<Listener>();
  private conflicts: Conflict[] = [];
  private processing = false;
  private remoteHashes: Record<string, string> = {};

  constructor() {
    this.loadQueue();
    this.loadHashes();
    if (isBrowser) {
      window.addEventListener('online', () => this.processQueue());
    }
  }

  onChange(cb: Listener) {
    this.listeners.add(cb);
    cb(this.status, this.queue.length, this.conflicts);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    for (const cb of Array.from(this.listeners)) {
      try { cb(this.status, this.queue.length, this.conflicts); } catch {}
    }
  }

  private setStatus(status: SyncStatus) {
    if (this.status !== status) {
      this.status = status;
      this.emit();
    }
  }

  private saveQueue() {
    if (!isBrowser) return;
    try { localStorage.setItem(QUEUE_KEY, JSON.stringify(this.queue)); } catch {}
  }

  private loadQueue() {
    if (!isBrowser) return;
    try {
      const raw = localStorage.getItem(QUEUE_KEY);
      if (raw) this.queue = JSON.parse(raw);
    } catch {}
  }

  private saveHashes() {
    if (!isBrowser) return;
    try { localStorage.setItem(REMOTE_HASH_KEY, JSON.stringify(this.remoteHashes)); } catch {}
  }

  private loadHashes() {
    if (!isBrowser) return;
    try {
      const raw = localStorage.getItem(REMOTE_HASH_KEY);
      if (raw) this.remoteHashes = JSON.parse(raw);
    } catch {}
  }

  async init() {
    // Seed from backend if WC FS is empty and not seeded before
    await webContainerFS.ensureReady();
    const list = await webContainerFS.list();
    const alreadySeeded = isBrowser && localStorage.getItem(SEEDED_KEY) === '1';
    if (!alreadySeeded && list.length === 0) {
      try {
        await this.pullAll();
        if (isBrowser) localStorage.setItem(SEEDED_KEY, '1');
      } catch {}
    }

    // Watch local FS changes and enqueue
    webContainerFS.watch((e) => {
      const ts = Date.now();
      if (isIgnoredPath(e.path)) return;
      if (e.type === 'file:created') {
        if (e.isFolder) {
          this.enqueue({ op: 'create', path: e.path, isFolder: true, ts });
        } else {
          // For files, read content
          (async () => {
            try {
              const content = await webContainerFS.readFile(e.path);
              const baseRemoteHash = this.remoteHashes[e.path] || null;
              this.enqueue({ op: 'create', path: e.path, content, ts, baseRemoteHash });
            } catch {}
          })();
        }
      } else if (e.type === 'file:updated') {
        if (isIgnoredPath(e.path)) return;
        (async () => {
          try {
            const content = await webContainerFS.readFile(e.path);
            const baseRemoteHash = this.remoteHashes[e.path] || null;
            this.enqueue({ op: 'update', path: e.path, content, ts, baseRemoteHash });
          } catch {}
        })();
      } else if (e.type === 'file:deleted') {
        if (isIgnoredPath(e.path)) return;
        this.enqueue({ op: 'delete', path: e.path, ts });
      }
    });

    // Start initial processing
    this.processQueue();
  }

  private enqueue(change: SyncChange) {
    // Coalesce: remove older ops for same path when possible
    this.queue = this.queue.filter(c => !(c.path === change.path && (
      (change.op === 'update' && (c.op === 'update' || c.op === 'create')) ||
      (change.op === 'delete')
    )));
    this.queue.push(change);
    this.saveQueue();
    this.emit();
    // Debounced process to batch ops
    if (this._debounce) clearTimeout(this._debounce);
    this._debounce = setTimeout(() => this.processQueue(), 500);
  }

  private _debounce: any = null;

  private async authHeaders() {
    const token = await getFreshAccessToken(supabase);
    return { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  }

  private async pushChange(ch: SyncChange) {
    // Use v2 endpoints
    const headers = await this.authHeaders();
    if (ch.op === 'create') {
      if (ch.isFolder) {
        await fetch(`/api/v2/file/${encodeURIComponent(ch.path)}`, { method: 'POST', headers, body: JSON.stringify({ isFolder: true }) });
      } else {
        if (typeof ch.content === 'string') {
          // Conflict check: fetch remote content if we have a baseRemoteHash
          if (ch.baseRemoteHash) {
            const r = await fetch(`/api/v2/file/${encodeURIComponent(ch.path)}`, { headers });
            if (r.ok) {
              const { content: remote } = await r.json();
              const remoteHash = sha256(remote || '');
              if (remote && remote.length > 0 && remoteHash !== ch.baseRemoteHash) {
                // Conflict
                this.conflicts.push({ path: ch.path, localContent: ch.content, remoteContent: remote });
                this.setStatus('conflict');
                return; // do not overwrite
              }
            }
          }
          await fetch(`/api/v2/file/${encodeURIComponent(ch.path)}`, { method: 'PUT', headers, body: JSON.stringify({ content: ch.content }) });
          this.remoteHashes[ch.path] = sha256(ch.content);
        }
      }
    } else if (ch.op === 'update') {
      // Conflict check
      if (ch.baseRemoteHash) {
        const r = await fetch(`/api/v2/file/${encodeURIComponent(ch.path)}`, { headers });
        if (r.ok) {
          const { content: remote } = await r.json();
          const remoteHash = sha256(remote || '');
          if (remote && remote.length > 0 && remoteHash !== ch.baseRemoteHash) {
            this.conflicts.push({ path: ch.path, localContent: ch.content, remoteContent: remote });
            this.setStatus('conflict');
            return;
          }
        }
      }
      await fetch(`/api/v2/file/${encodeURIComponent(ch.path)}`, { method: 'PUT', headers, body: JSON.stringify({ content: ch.content || '' }) });
      if (typeof ch.content === 'string') this.remoteHashes[ch.path] = sha256(ch.content);
    } else if (ch.op === 'delete') {
      await fetch(`/api/v2/file/${encodeURIComponent(ch.path)}`, { method: 'DELETE', headers });
      delete this.remoteHashes[ch.path];
    }
  }

  async processQueue() {
    if (!isBrowser) return;
    if (this.processing) return;
    if (this.queue.length === 0) {
      // If we are not in conflict, go idle
      if (this.conflicts.length === 0) this.setStatus('idle');
      return;
    }
    if (!navigator.onLine) {
      this.setStatus('offline');
      return;
    }
    this.processing = true;
    this.setStatus('syncing');
    try {
      while (this.queue.length > 0) {
        const ch = this.queue[0];
        try {
          await this.pushChange(ch);
          // If conflict occurred, stop processing to let user resolve
          if (this.status === 'conflict') break;
          this.queue.shift();
          this.saveQueue();
        } catch (e) {
          // Network or server error -> offline
          this.setStatus('offline');
          break;
        }
      }
      this.saveHashes();
      if (this.queue.length === 0 && this.conflicts.length === 0) this.setStatus('idle');
    } finally {
      this.processing = false;
      this.emit();
    }
  }

  async pullAll() {
    // Pull all files (with content) and write into WebContainer FS if not present
    const headers = await this.authHeaders();
    const res = await fetch('/api/v2/files?recursive=1&withContent=1', { headers });
    if (!res.ok) throw new Error('Failed to pull files');
    const list = await res.json();
    await webContainerFS.ensureReady();
    for (const item of list) {
      if (item.isDir) {
        await webContainerFS.create(item.path, true);
      } else {
        await webContainerFS.writeFile(item.path, item.content || '');
        this.remoteHashes[item.path] = sha256(item.content || '');
      }
    }
    this.saveHashes();
  }

  getConflicts() { return [...this.conflicts]; }

  async resolveConflict(path: string, choice: 'keep-local' | 'keep-remote') {
    const conflictIdx = this.conflicts.findIndex(c => c.path === path);
    if (conflictIdx < 0) return;
    const c = this.conflicts[conflictIdx];
    const headers = await this.authHeaders();

    if (choice === 'keep-local') {
      const content = c.localContent || '';
      await fetch(`/api/v2/file/${encodeURIComponent(path)}`, { method: 'PUT', headers, body: JSON.stringify({ content }) });
      await webContainerFS.writeFile(path, content);
      this.remoteHashes[path] = sha256(content);
    } else {
      const content = c.remoteContent || '';
      await webContainerFS.writeFile(path, content);
      this.remoteHashes[path] = sha256(content);
    }

    this.conflicts.splice(conflictIdx, 1);
    this.saveHashes();
    if (this.conflicts.length === 0) {
      this.setStatus('idle');
      // Continue processing remaining queue if any
      this.processQueue();
    } else {
      this.emit();
    }
  }
}

export const synchronizationService = isBrowser ? new SynchronizationService() : null;
