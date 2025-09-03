import pty from 'node-pty';
import { UserWorkspaceManager } from './UserWorkspaceManager.js';
import fs from 'fs';
import path from 'path';

export class UserTerminalManager {
  // Map of userId -> Map of terminalId -> PTY process
  static userIdToTerminals = new Map();
  // Add caching for faster terminal creation
  static terminalCache = new Map();
  static cacheTimeout = 30000; // 30 seconds

  static startTerminal(userId, shell = 'bash', cols = 80, rows = 34, terminalId = null) {
    // Check cache first
    const cacheKey = `${userId}_${cols}_${rows}`;
    const cached = UserTerminalManager.terminalCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < UserTerminalManager.cacheTimeout) {
      // Return cached terminal with new ID
      const newTerminalId = terminalId || `term_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const terminalsForUser = UserTerminalManager.userIdToTerminals.get(userId) || new Map();
      terminalsForUser.set(newTerminalId, cached.pty);
      return { id: newTerminalId, pty: cached.pty };
    }

    // Ensure map for user exists
    if (!UserTerminalManager.userIdToTerminals.has(userId)) {
      UserTerminalManager.userIdToTerminals.set(userId, new Map());
    }
    const terminalsForUser = UserTerminalManager.userIdToTerminals.get(userId);

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
      
      ptyProcess.write('clear\n');
    }, 50); 
    
    terminalsForUser.set(terminalId, ptyProcess);
    
    // Cache the terminal for reuse
    UserTerminalManager.terminalCache.set(cacheKey, {
      pty: ptyProcess,
      timestamp: Date.now()
    });
    
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