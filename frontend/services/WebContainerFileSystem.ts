import { webContainerService } from '@/services/WebContainerService';
import type { WebContainer } from '@webcontainer/api';

export type FsEvent =
  | { type: 'file:created'; path: string; isFolder?: boolean }
  | { type: 'file:updated'; path: string }
  | { type: 'file:deleted'; path: string };

type WatchUnsubscribe = () => void;

// Utility: join and normalize POSIX-style paths
const joinPath = (a: string, b: string) => (a ? (a.endsWith('/') ? a.slice(0, -1) : a) + '/' + b : b);
const toRel = (p: string) => (p.startsWith('/') ? p.slice(1) : p);

class WebContainerFileSystem {
  private wc: WebContainer | null = null;
  private watchers: Set<(e: FsEvent) => void> = new Set();
  private pollingTimer: any = null;
  private snapshot: Set<string> = new Set();

  async ensureReady(): Promise<WebContainer> {
    if (this.wc) return this.wc;
    this.wc = await webContainerService.get();
    // Seed snapshot for change detection
    await this.refreshSnapshot();
    // Start passive polling watcher (fallback for external changes)
    this.startPolling();
    return this.wc;
  }

  private async refreshSnapshot() {
    const all = await this.listPaths();
    this.snapshot = new Set(all);
  }

  private startPolling(intervalMs = 2000) {
    if (this.pollingTimer) return;
    this.pollingTimer = setInterval(async () => {
      try {
        const now = new Set(await this.listPaths());
        // Detect additions
        for (const p of Array.from(now)) {
          if (!this.snapshot.has(p)) {
            const isFolder = p.endsWith('/');
            this.emit({ type: 'file:created', path: p.replace(/\/$/, ''), isFolder });
          }
        }
        // Detect deletions
        for (const p of Array.from(this.snapshot)) {
          if (!now.has(p)) {
            this.emit({ type: 'file:deleted', path: p.replace(/\/$/, '') });
          }
        }
        this.snapshot = now;
      } catch {
        // ignore polling errors
      }
    }, intervalMs);
  }

  private emit(event: FsEvent) {
    for (const cb of Array.from(this.watchers)) {
      try { cb(event); } catch {}
    }
  }

  watch(cb: (e: FsEvent) => void): WatchUnsubscribe {
    this.watchers.add(cb);
    return () => this.watchers.delete(cb);
  }

  async list(): Promise<Array<{ name: string; isDirectory: boolean }>> {
    await this.ensureReady();
    const out: Array<{ name: string; isDirectory: boolean }> = [];
    const push = (path: string, isDir: boolean) => {
      const rel = toRel(path);
      if (rel) out.push({ name: rel, isDirectory: isDir });
    };

    const walk = async (dir: string) => {
      const entries = await this.wc!.fs.readdir(dir || '/', { withFileTypes: true } as any);
      for (const entry of entries as any[]) {
        const name = typeof entry === 'string' ? entry : entry.name;
        const isDir = typeof entry === 'string' ? false : !!entry.isDirectory?.();
        const full = dir === '/' || dir === '' ? `/${name}` : `${dir}/${name}`;
        if (isDir) {
          push(full.slice(1), true);
          await walk(full);
        } else {
          push(full.slice(1), false);
        }
      }
    };

    // Root-level walk
    try {
      await walk('/');
    } catch (e) {
      // If root not present, ignore
    }
    return out;
  }

  // Snapshot list including folders marked with trailing '/'
  private async listPaths(): Promise<string[]> {
    const items = await this.list();
    // Convert to paths; add trailing slash marker for folders for change detection
    return items.map(i => (i.isDirectory ? i.name + '/' : i.name));
  }

  async readFile(path: string): Promise<string> {
    await this.ensureReady();
    const p = '/' + toRel(path);
    const data = await this.wc!.fs.readFile(p);
    if (typeof data === 'string') return data;
    return new TextDecoder().decode(data as any);
  }

  async writeFile(path: string, content: string): Promise<void> {
    await this.ensureReady();
    const p = '/' + toRel(path);
    // Ensure parent exists
    const parts = p.split('/');
    parts.pop();
    const parent = parts.join('/') || '/';
    if (parent && parent !== '/') {
      try { await this.wc!.fs.mkdir(parent, { recursive: true } as any); } catch {}
    }
    await this.wc!.fs.writeFile(p, content);
    this.emit({ type: 'file:updated', path: toRel(p) });
  }

  async create(path: string, isFolder: boolean): Promise<void> {
    await this.ensureReady();
    const p = '/' + toRel(path);
    if (isFolder) {
      await this.wc!.fs.mkdir(p, { recursive: true } as any);
    } else {
      // Ensure parent exists then create empty file
      const parts = p.split('/');
      parts.pop();
      const parent = parts.join('/') || '/';
      if (parent && parent !== '/') {
        try { await this.wc!.fs.mkdir(parent, { recursive: true } as any); } catch {}
      }
      await this.wc!.fs.writeFile(p, '');
    }
    await this.refreshSnapshot();
    this.emit({ type: 'file:created', path: toRel(p), isFolder });
  }

  async delete(path: string): Promise<void> {
    await this.ensureReady();
    const p = '/' + toRel(path);
    await this.wc!.fs.rm(p, { recursive: true } as any);
    await this.refreshSnapshot();
    this.emit({ type: 'file:deleted', path: toRel(p) });
  }

  async rename(oldPath: string, newPath: string): Promise<void> {
    await this.ensureReady();
    const from = '/' + toRel(oldPath);
    const to = '/' + toRel(newPath);
    // Ensure destination dir exists
    const parts = to.split('/');
    parts.pop();
    const parent = parts.join('/') || '/';
    if (parent && parent !== '/') {
      try { await this.wc!.fs.mkdir(parent, { recursive: true } as any); } catch {}
    }
    await this.wc!.fs.rename(from, to);
    await this.refreshSnapshot();
    // Emit delete + create for simplicity
    this.emit({ type: 'file:deleted', path: toRel(from) });
    this.emit({ type: 'file:created', path: toRel(to) });
  }
}

export const webContainerFS = new WebContainerFileSystem();

