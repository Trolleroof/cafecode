import { webContainerService } from '@/services/WebContainerService';
import type { WebContainerProcess } from '@webcontainer/api';

export type BuildStatus = 'idle' | 'building' | 'success' | 'failed';

type Listener = (status: BuildStatus, logs: string[]) => void;

class BuildService {
  private logs: string[] = [];
  private status: BuildStatus = 'idle';
  private listeners = new Set<Listener>();
  private proc: WebContainerProcess | null = null;

  watch(cb: Listener) {
    this.listeners.add(cb);
    cb(this.status, [...this.logs]);
    return () => this.listeners.delete(cb);
  }

  private emit() {
    for (const cb of Array.from(this.listeners)) {
      try { cb(this.status, [...this.logs]); } catch {}
    }
  }

  private reset() {
    this.logs = [];
    this.status = 'idle';
  }

  private append(line: string) {
    // Keep last 2000 lines
    this.logs.push(line);
    if (this.logs.length > 2000) this.logs.shift();
    this.emit();
  }

  async runBuild(custom?: string[]) {
    if (this.proc) try { this.proc.kill(); } catch {}
    this.reset();
    this.status = 'building';
    this.emit();

    const wc = await webContainerService.get();
    const cmd = custom && custom.length ? custom : ['npm', 'run', 'build'];
    const proc = await wc.spawn(cmd[0], cmd.slice(1));
    this.proc = proc;

    // Stream logs
    const reader = proc.output.getReader();
    (async () => {
      try {
        while (true) {
          const { value, done } = await reader.read();
          if (done || value === undefined) break;
          this.append(value);
        }
      } catch {}
    })();

    const code = await proc.exit;
    this.proc = null;
    this.status = code === 0 ? 'success' : 'failed';
    this.emit();
  }
}

export const buildService = new BuildService();

