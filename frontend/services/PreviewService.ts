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
    // Try default dev command
    await devServerManager.start();
  }
}

export const previewService = new PreviewService();

