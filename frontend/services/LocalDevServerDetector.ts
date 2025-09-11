export type DevFramework = 'vite' | 'next' | 'react' | 'unknown';

export interface LocalDevServer {
  url: string;
  port: number;
  framework: DevFramework;
  isRunning: boolean;
}

class LocalDevServerDetector {
  private static instance: LocalDevServerDetector;
  private commonPorts = [3000, 3001, 5173, 8080, 8000, 3002, 3003];
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private listeners: ((server: LocalDevServer | null) => void)[] = [];

  static getInstance(): LocalDevServerDetector {
    if (!LocalDevServerDetector.instance) {
      LocalDevServerDetector.instance = new LocalDevServerDetector();
    }
    return LocalDevServerDetector.instance;
  }

  async detectDevServer(): Promise<LocalDevServer | null> {
    for (const port of this.commonPorts) {
      const ok = await this.checkPort(port);
      if (ok) {
        const framework = await this.detectFramework(port);
        return {
          url: `http://localhost:${port}`,
          port,
          framework,
          isRunning: true,
        };
      }
    }
    return null;
  }

  private async checkPort(port: number): Promise<boolean> {
    try {
      // no-cors returns an opaque response but resolves if port is open
      await fetch(`http://localhost:${port}`, {
        method: 'HEAD',
        mode: 'no-cors',
        cache: 'no-cache',
      });
      return true;
    } catch (_) {
      return false;
    }
  }

  private async detectFramework(port: number): Promise<DevFramework> {
    // Best-effort detection based on port and simple fetch
    if (port === 5173) return 'vite';
    if (port === 3000) return 'next';
    try {
      await fetch(`http://localhost:${port}`, { mode: 'no-cors' });
      // Could enhance with additional heuristics if CORS allows
      return port === 3000 ? 'next' : port === 5173 ? 'vite' : 'unknown';
    } catch {
      return 'unknown';
    }
  }

  startPolling(intervalMs: number = 5000): void {
    if (this.checkInterval) return;
    this.checkInterval = setInterval(async () => {
      const server = await this.detectDevServer();
      this.notifyListeners(server);
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  addListener(callback: (server: LocalDevServer | null) => void): void {
    this.listeners.push(callback);
  }

  removeListener(callback: (server: LocalDevServer | null) => void): void {
    this.listeners = this.listeners.filter((l) => l !== callback);
  }

  private notifyListeners(server: LocalDevServer | null): void {
    this.listeners.forEach((l) => l(server));
  }
}

export default LocalDevServerDetector;

