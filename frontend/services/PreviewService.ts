import { devServerManager, type DevServer } from '@/services/DevServerManager';

type Listener = (servers: DevServer[], primaryUrl?: string) => void;

class PreviewService {
  private listeners: Set<Listener> = new Set();

  watch(cb: Listener) {
    const unsub = devServerManager.watch((servers) => {
      cb(servers, devServerManager.primaryUrl());
    });
    this.listeners.add(cb);
    // Emit immediately
    cb(devServerManager.list(), devServerManager.primaryUrl());
    return () => {
      this.listeners.delete(cb);
      unsub();
    };
  }

  async autoStart() {
    // Wait up to ~30s for package.json to appear (handles initial seed)
    const maxWaitMs = 30000;
    const start = Date.now();
    while (Date.now() - start < maxWaitMs) {
      try {
        // detectCommand throws if no package.json; success means ready
        const cmd = await devServerManager.detectCommand();
        await devServerManager.start(cmd);
        return;
      } catch (e) {
        // Not ready yet
        await new Promise(r => setTimeout(r, 800));
      }
    }
    // Final attempt: start with default and let error bubble to caller
    await devServerManager.start();
  }
}

export const previewService = new PreviewService();
