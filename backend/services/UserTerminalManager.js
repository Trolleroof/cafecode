import pty from 'node-pty';
import { UserWorkspaceManager } from './UserWorkspaceManager.js';
import fs from 'fs';
import path from 'path';

export class UserTerminalManager {
  // Map userId to PTY process
  static terminals = new Map();

  static startTerminal(userId, shell = 'bash', cols = 80, rows = 34) {
    // kills terminal if it already exists for the user
    if (UserTerminalManager.terminals.has(userId)) {
      UserTerminalManager.terminals.get(userId).kill();
    }
    const cwd = UserWorkspaceManager.getTerminalRoot(userId);
    
    // Ensure the workspace directory exists
    if (!fs.existsSync(cwd)) {
      fs.mkdirSync(cwd, { recursive: true });
    }
    
    // Always use bash as the shell
    let shellCmd = 'bash';
    let shellArgs = ['-i'];
    
    // Set environment variables for better terminal experience
    const env = {
      ...process.env,
      TERM: 'xterm-color',
      USER: userId,
      HOME: cwd,
      PWD: cwd,
      SHELL: shellCmd,
      PS1: '$ ', // Blank prompt
      HOSTNAME: 'mac',
    };
    
    const ptyProcess = pty.spawn(shellCmd, shellArgs, {
      name: 'xterm-color',
      cols,
      rows,
      cwd,
      env,
    });
    
    // Set up initial terminal state
    setTimeout(() => {
      // Change to workspace directory
      ptyProcess.write(`cd "${cwd}"\n`);
      // Set the prompt again in case bashrc overrides it
      ptyProcess.write('export PS1="$ "\n');
      // Show welcome message
      ptyProcess.write('echo "Welcome to your coding workspace!"\n');
      ptyProcess.write('echo "Current directory: $(pwd)"\n');
      ptyProcess.write('echo "Use ls to see your files"\n');
      ptyProcess.write('clear\n');
    }, 500);
    
    UserTerminalManager.terminals.set(userId, ptyProcess);
    return ptyProcess;
  }

  static getTerminal(userId) {
    return UserTerminalManager.terminals.get(userId);
  }

  static killTerminal(userId) {
    const term = UserTerminalManager.terminals.get(userId);
    if (term) {
      term.kill();
      UserTerminalManager.terminals.delete(userId);
    }
  }

  // Get current working directory for a user's terminal
  static getTerminalCwd(userId) {
    const term = UserTerminalManager.terminals.get(userId);
    if (term) {
      // Note: This is a simplified approach. In a real implementation,
      // you might need to track the current directory more accurately
      return UserWorkspaceManager.getTerminalRoot(userId);
    }
    return null;
  }

  // Execute a command in the user's terminal
  static executeCommand(userId, command) {
    const term = UserTerminalManager.terminals.get(userId);
    if (term) {
      term.write(command + '\n');
      return true;
    }
    return false;
  }
} 