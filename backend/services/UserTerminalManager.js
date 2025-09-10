import pty from 'node-pty';
import { UserWorkspaceManager } from './UserWorkspaceManager.js';
import fs from 'fs';
import path from 'path';

export class UserTerminalManager {
  // Map of userId -> Map of terminalId -> PTY process
  static userIdToTerminals = new Map();

  static startTerminal(userId, shell = 'bash', cols = 80, rows = 34, terminalId = null) {
    // Ensure map for user exists
    if (!UserTerminalManager.userIdToTerminals.has(userId)) {
      UserTerminalManager.userIdToTerminals.set(userId, new Map());
    }
    const terminalsForUser = UserTerminalManager.userIdToTerminals.get(userId);

    // If a terminalId is provided and exists, reuse that specific PTY (reconnect case)
    if (terminalId && terminalsForUser.has(terminalId)) {
      return { id: terminalId, pty: terminalsForUser.get(terminalId) };
    }

    // Generate terminalId if not provided
    if (!terminalId) {
      terminalId = `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    }

    const cwd = UserWorkspaceManager.getTerminalRoot(userId);
    
    // Prepare shared package cache directories (outside the workspace) per user
    const sharedCacheRoot = path.resolve(UserWorkspaceManager.baseDir, '..', 'package-caches', userId);
    const npmCacheDir = path.join(sharedCacheRoot, 'npm');
    const yarnCacheDir = path.join(sharedCacheRoot, 'yarn');
    const bunCacheDir = path.join(sharedCacheRoot, 'bun');
    
    // Ensure the workspace directory exists
    if (!fs.existsSync(cwd)) {
      fs.mkdirSync(cwd, { recursive: true });
    }
    // Ensure shared caches exist
    try {
      fs.mkdirSync(npmCacheDir, { recursive: true });
      fs.mkdirSync(yarnCacheDir, { recursive: true });
      fs.mkdirSync(bunCacheDir, { recursive: true });
    } catch (_) {}
    
    // Optimized environment setup
    const env = {
      ...process.env,
      TERM: 'xterm-color',
      USER: userId,
      HOME: cwd,
      PWD: cwd,
      SHELL: 'bash',
      PS1: '$ ',
      HOSTNAME: 'mac',
      // Performance optimizations
      // Combine options rather than overwrite: more memory and prefer IPv4 DNS
      NODE_OPTIONS: '--max-old-space-size=4096 --dns-result-order=ipv4first',
      npm_config_cache: npmCacheDir, // Shared npm cache per user
      npm_config_prefer_offline: 'true', // Use offline cache when possible
      npm_config_progress: 'false', // Reduce terminal overhead
      npm_config_audit: 'false', // Skip audit for speed
      npm_config_fund: 'false', // Skip funding messages
      // Allow lifecycle scripts to run when user is root (Docker/Fly runtime)
      npm_config_unsafe_perm: 'true',
      // Always set a registry (defaults to npmjs if not provided)
      npm_config_registry: process.env.NPM_REGISTRY || 'https://registry.npmjs.org',
      // Yarn and Bun caches (if user chooses to use them)
      YARN_CACHE_FOLDER: yarnCacheDir,
      BUN_INSTALL_CACHE_DIR: bunCacheDir,
      // Increase libuv threadpool for concurrent FS work during installs
      UV_THREADPOOL_SIZE: process.env.UV_THREADPOOL_SIZE || '8',
      // Add CafeCode utilities to PATH
      PATH: `/tmp/cafecode/bin:${process.env.PATH}`,
      // Development server networking configuration
      HOST: '0.0.0.0', // Allow connections from any interface
      WDS_SOCKET_HOST: '0.0.0.0', // Webpack Dev Server socket host
      VITE_HOST: '0.0.0.0', // Vite dev server host
      VITE_PORT: '5173', // Default Vite port
      PORT: '3000', // Default port for other dev servers
      // Prevent browser auto-opening
      BROWSER: 'none', // Disable browser auto-opening
      REACT_EDITOR: 'none', // Disable React editor auto-opening
      EDITOR: 'none', // Disable editor auto-opening
      VITE_OPEN_BROWSER: 'false', // Disable Vite browser auto-opening
    };
    
    const ptyProcess = pty.spawn('bash', ['-i'], {
      name: 'xterm-color',
      cols,
      rows,
      cwd,
      env,
    });
    
    // Optimized initial setup with reduced delay
    setTimeout(() => {
      ptyProcess.write(`cd "${cwd}"\n`);
      ptyProcess.write('export PS1="$ "\n');
      
      // Enable Corepack so pnpm/yarn are available in this shell
      ptyProcess.write('corepack enable >/dev/null 2>&1 || true\n');
      
      ptyProcess.write('npm config set prefer-offline true\n');
      ptyProcess.write('npm config set audit false\n');
      ptyProcess.write('npm config set fund false\n');
      ptyProcess.write('npm config set progress false\n');
      ptyProcess.write('npm config set unsafe-perm true\n');
      // Point npm to shared cache directory
      ptyProcess.write(`npm config set cache \"${npmCacheDir}\"\n`);
      // Skip deprecated 'cache-min' to avoid noisy warnings
      // Set registry explicitly for this terminal session (use default if env not set)
      ptyProcess.write(`npm config set registry ${process.env.NPM_REGISTRY || 'https://registry.npmjs.org'}\n`);
      
      // Set up development server environment variables for better networking
      ptyProcess.write('export HOST=0.0.0.0\n');
      ptyProcess.write('export WDS_SOCKET_HOST=0.0.0.0\n');
      ptyProcess.write('export VITE_HOST=0.0.0.0\n');
      ptyProcess.write('export VITE_PORT=5173\n');
      ptyProcess.write('export PORT=3000\n');
      
      // Add helpful aliases for common dev server commands
      ptyProcess.write('alias vite-dev="npm run dev -- --host 0.0.0.0 --no-open"\n');
      ptyProcess.write('alias react-dev="HOST=0.0.0.0 npm start"\n');
      ptyProcess.write('alias next-dev="HOSTNAME=0.0.0.0 npm run dev"\n');
      
      // Set environment variables to prevent browser auto-opening FIRST
      ptyProcess.write('export BROWSER=none\n');
      ptyProcess.write('export REACT_EDITOR=none\n');
      ptyProcess.write('export EDITOR=none\n');
      ptyProcess.write('export VITE_OPEN_BROWSER=false\n');
      
      // Create a comprehensive dummy xdg-open that always works
      ptyProcess.write('mkdir -p /tmp/cafecode/bin\n');
      ptyProcess.write('cat > /tmp/cafecode/bin/xdg-open << "EOF"\n');
      ptyProcess.write('#!/bin/bash\n');
      ptyProcess.write('# CafeCode dummy xdg-open - prevents browser opening errors\n');
      ptyProcess.write('echo "Browser opening disabled in CafeCode environment"\n');
      ptyProcess.write('echo "URL would have been: $1"\n');
      ptyProcess.write('exit 0\n');
      ptyProcess.write('EOF\n');
      ptyProcess.write('chmod +x /tmp/cafecode/bin/xdg-open\n');
      
      // Add our dummy xdg-open to PATH (highest priority)
      ptyProcess.write('export PATH="/tmp/cafecode/bin:$PATH"\n');
      
      // Try to install xdg-utils with sudo, but don\'t fail if it doesn\'t work
      ptyProcess.write('if ! which xdg-open >/dev/null 2>&1; then\n');
      ptyProcess.write('  echo "Setting up browser utilities for CafeCode..."\n');
      ptyProcess.write('  if command -v sudo >/dev/null 2>&1; then\n');
      ptyProcess.write('    sudo apt-get update >/dev/null 2>&1 && sudo apt-get install -y xdg-utils >/dev/null 2>&1 && echo "xdg-utils installed" || echo "Could not install xdg-utils with sudo"\n');
      ptyProcess.write('  else\n');
      ptyProcess.write('    echo "sudo not available, using dummy xdg-open"\n');
      ptyProcess.write('  fi\n');
      ptyProcess.write('fi\n');
      
      // Create a global Vite configuration that disables browser opening
      ptyProcess.write('mkdir -p /usr/local/share/cafecode\n');
      ptyProcess.write('cat > /usr/local/share/cafecode/vite.config.js << "EOF"\n');
      ptyProcess.write('import { defineConfig } from "vite"\n');
      ptyProcess.write('import react from "@vitejs/plugin-react"\n');
      ptyProcess.write('\n');
      ptyProcess.write('export default defineConfig({\n');
      ptyProcess.write('  plugins: [react()],\n');
      ptyProcess.write('  server: {\n');
      ptyProcess.write('    host: "0.0.0.0",\n');
      ptyProcess.write('    port: 5173,\n');
      ptyProcess.write('    open: false,\n');
      ptyProcess.write('  },\n');
      ptyProcess.write('  preview: {\n');
      ptyProcess.write('    host: "0.0.0.0",\n');
      ptyProcess.write('    port: 4173,\n');
      ptyProcess.write('    open: false,\n');
      ptyProcess.write('  },\n');
      ptyProcess.write('})\n');
      ptyProcess.write('EOF\n');
      
      // Add function to fix Vite config for CafeCode environment
      ptyProcess.write('fix-vite-config() {\n');
      ptyProcess.write('  if [ -f "vite.config.js" ]; then\n');
      ptyProcess.write('    echo "Fixing Vite configuration for CafeCode environment..."\n');
      ptyProcess.write('    # Backup original config\n');
      ptyProcess.write('    cp vite.config.js vite.config.js.backup 2>/dev/null || true\n');
      ptyProcess.write('    # Copy CafeCode-optimized config\n');
      ptyProcess.write('    cp /usr/local/share/cafecode/vite.config.js ./vite.config.js\n');
      ptyProcess.write('    echo "Vite configuration updated for CafeCode!"\n');
      ptyProcess.write('  else\n');
      ptyProcess.write('    echo "No vite.config.js found in current directory"\n');
      ptyProcess.write('  fi\n');
      ptyProcess.write('}\n');
      
      ptyProcess.write('clear\n');
    }, 50); 
    
    terminalsForUser.set(terminalId, ptyProcess);
    
    return { id: terminalId, pty: ptyProcess };
  }

  static getTerminal(userId, terminalId) {
    const terminalsForUser = UserTerminalManager.userIdToTerminals.get(userId);
    if (!terminalsForUser) return null;
    if (!terminalId) {
      // Return first terminal if exists
      const first = terminalsForUser.values().next();
      return first && !first.done ? { id: [...terminalsForUser.keys()][0], pty: first.value } : null;
    }
    const ptyProcess = terminalsForUser.get(terminalId);
    return ptyProcess ? { id: terminalId, pty: ptyProcess } : null;
  }

  static listTerminals(userId) {
    const terminalsForUser = UserTerminalManager.userIdToTerminals.get(userId);
    if (!terminalsForUser) return [];
    return [...terminalsForUser.keys()];
  }

  static killTerminal(userId, terminalId) {
    const terminalsForUser = UserTerminalManager.userIdToTerminals.get(userId);
    if (!terminalsForUser) return false;
    const term = terminalsForUser.get(terminalId);
    if (term) {
      term.kill();
      terminalsForUser.delete(terminalId);
      if (terminalsForUser.size === 0) {
        UserTerminalManager.userIdToTerminals.delete(userId);
      }
      return true;
    }
    return false;
  }

  static killAllTerminals(userId) {
    const terminalsForUser = UserTerminalManager.userIdToTerminals.get(userId);
    if (!terminalsForUser) return;
    for (const term of terminalsForUser.values()) {
      try { term.kill(); } catch (_) {}
    }
    UserTerminalManager.userIdToTerminals.delete(userId);
  }

  // Execute a command in a specific terminal
  static executeCommand(userId, terminalId, command) {
    const terminal = UserTerminalManager.getTerminal(userId, terminalId);
    if (terminal) {
      terminal.pty.write(command + '\n');
      return true;
    }
    return false;
  }
} 
