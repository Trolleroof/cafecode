import { WebContainer, type WebContainer as WebContainerType, type WebContainerProcess } from '@webcontainer/api';

// Simple singleton manager around WebContainer lifecycle and shells
class WebContainerService {
  private instance: WebContainerType | null = null;
  private bootPromise: Promise<WebContainerType> | null = null;

  // Boot WebContainer once; reuse across consumers
  async boot(): Promise<WebContainerType> {
    if (this.instance) return this.instance;
    if (this.bootPromise) return this.bootPromise;

    this.bootPromise = WebContainer.boot().then((wc) => {
      this.instance = wc;
      return wc;
    }).catch((err) => {
      this.bootPromise = null;
      throw err;
    });

    return this.bootPromise;
  }

  get isBooted(): boolean {
    return !!this.instance;
  }

  // Ensure booted and return instance
  async get(): Promise<WebContainerType> {
    if (this.instance) return this.instance;
    return this.boot();
  }

  // Spawn an interactive shell process wired for a terminal
  async spawnShell(opts?: { cols?: number; rows?: number }): Promise<WebContainerProcess> {
    const wc = await this.get();
    const term = {
      terminal: {
        cols: opts?.cols ?? 80,
        rows: opts?.rows ?? 24,
      },
    } as const;
    // Try common shells in order
    const candidates = ["bash", "sh", "jsh"] as const;
    let lastErr: unknown = null;
    for (const cmd of candidates) {
      try {
        // @ts-ignore - types accept string command
        const proc = await wc.spawn(cmd as any, term as any);
        return proc;
      } catch (e) {
        lastErr = e;
      }
    }
    throw lastErr ?? new Error("No shell available in WebContainer");
  }
}

export const webContainerService = new WebContainerService();
