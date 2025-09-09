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
    
    // Ensure the workspace directory exists
    if (!fs.existsSync(cwd)) {
      fs.mkdirSync(cwd, { recursive: true });
    }
    
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
      NODE_OPTIONS: '--max-old-space-size=4096', // Increase memory for faster npm operations
      npm_config_cache: path.join(cwd, '.npm-cache'), // Local npm cache
      npm_config_prefer_offline: 'true', // Use offline cache when possible
      npm_config_progress: 'false', // Reduce terminal overhead
      npm_config_audit: 'false', // Skip audit for speed
      npm_config_fund: 'false', // Skip funding messages
      // Always set a registry (defaults to npmjs if not provided)
      npm_config_registry: process.env.NPM_REGISTRY || 'https://registry.npmjs.org',
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
      
      ptyProcess.write('npm config set prefer-offline true\n');
      ptyProcess.write('npm config set audit false\n');
      ptyProcess.write('npm config set fund false\n');
      ptyProcess.write('npm config set progress false\n');
      // Skip deprecated 'cache-min' to avoid noisy warnings
      // Set registry explicitly for this terminal session (use default if env not set)
      ptyProcess.write(`npm config set registry ${process.env.NPM_REGISTRY || 'https://registry.npmjs.org'}\n`);
      
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
