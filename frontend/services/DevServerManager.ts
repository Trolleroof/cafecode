import { webContainerService } from '@/services/WebContainerService';
import type { WebContainer, WebContainerProcess } from '@webcontainer/api';

export type ServerStatus = 'idle' | 'installing' | 'starting' | 'running' | 'exited' | 'error';

export type DevServer = {
  id: string;
  cmd: string[];
  status: ServerStatus;
  port?: number;
  url?: string;
  exitCode?: number;
};

type Listener = (servers: DevServer[]) => void;

class DevServerManager {
  private wc: WebContainer | null = null;
  private servers: DevServer[] = [];
  private listeners: Set<Listener> = new Set();
  private procs: Map<string, WebContainerProcess> = new Map();
  private pendingQueue: string[] = [];
  private booted = false;

  private notify() {
    const snapshot = this.servers.map(s => ({ ...s }));
    for (const cb of Array.from(this.listeners)) {
      try { cb(snapshot); } catch {}
    }
  }

  watch(cb: Listener) {
    this.listeners.add(cb);
    cb(this.servers.map(s => ({ ...s })));
    return () => this.listeners.delete(cb);
  }

  async ensureBoot(): Promise<WebContainer> {
    if (this.wc) return this.wc;
    this.wc = await webContainerService.get();
    if (!this.booted) {
      // Attach once per instance
      this.wc.on('server-ready', (port: number, url: string) => {
        // Pair with most recent pending start if any; else create detached entry
        const id = this.pendingQueue.shift() || `srv_${port}`;
        let s = this.servers.find(x => x.id === id);
        if (!s) {
          s = { id, cmd: ['<unknown>'], status: 'running' };
          this.servers.push(s);
        }
        s.port = port;
        s.url = url;
        s.status = 'running';
        this.notify();
      });
      this.booted = true;
    }
    return this.wc;
  }

  private async hasFile(path: string): Promise<boolean> {
    const wc = await this.ensureBoot();
    try {
      await wc.fs.readFile(path);
      return true;
    } catch {
      return false;
    }
  }

  async ensureDependencies(): Promise<void> {
    const wc = await this.ensureBoot();
    const hasPackage = await this.hasFile('/package.json');
    if (!hasPackage) return; // nothing to install
    // If node_modules missing or empty, install
    let needInstall = false;
    try {
      const entries = await wc.fs.readdir('/node_modules');
      needInstall = !entries || (Array.isArray(entries) && entries.length === 0);
    } catch {
      needInstall = true;
    }
    if (!needInstall) return;

    const id = `install_${Date.now()}`;
    this.servers.push({ id, cmd: ['npm', 'install'], status: 'installing' });
    this.notify();
    const proc = await wc.spawn('npm', ['install']);
    const exitCode = await proc.exit;
    // Remove transient install entry
    this.servers = this.servers.filter(s => s.id !== id);
    if (exitCode !== 0) {
      // Record an error entry for visibility
      this.servers.push({ id, cmd: ['npm', 'install'], status: 'error', exitCode });
    }
    this.notify();
  }

  async start(command: string[] = ['npm', 'run', 'dev']): Promise<string> {
    const wc = await this.ensureBoot();
    // Must have a package.json for default dev command
    const hasPackage = await this.hasFile('/package.json');
    if (!hasPackage) {
      throw new Error('No package.json found');
    }
    // Best-effort ensure deps first
    await this.ensureDependencies().catch(() => {});
    const id = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const dev: DevServer = { id, cmd: command, status: 'starting' };
    this.servers.push(dev);
    this.pendingQueue.push(id);
    this.notify();

    const proc = await wc.spawn(command[0], command.slice(1), { terminal: { cols: 80, rows: 24 } as any });
    this.procs.set(id, proc);

    // Track exit
    (async () => {
      const code = await proc.exit;
      const s = this.servers.find(x => x.id === id);
      if (s) {
        s.status = s.status === 'running' ? 'exited' : 'error';
        s.exitCode = code;
      }
      this.procs.delete(id);
      // If it exited before server-ready, remove from pending queue
      this.pendingQueue = this.pendingQueue.filter(x => x !== id);
      this.notify();
    })();

    return id;
  }

  async stop(id: string): Promise<void> {
    const proc = this.procs.get(id);
    if (proc) {
      try { proc.kill(); } catch {}
      this.procs.delete(id);
    }
    const s = this.servers.find(x => x.id === id);
    if (s) {
      s.status = 'exited';
      this.notify();
    }
  }

  list(): DevServer[] {
    return this.servers.map(s => ({ ...s }));
  }

  primaryUrl(): string | undefined {
    const firstRunning = this.servers.find(s => s.status === 'running' && s.url);
    return firstRunning?.url;
  }
}

export const devServerManager = new DevServerManager();
