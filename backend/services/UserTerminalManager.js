import pty from 'node-pty';
import { UserWorkspaceManager } from './UserWorkspaceManager.js';

export class UserTerminalManager {
  // Map userId to PTY process
  static terminals = new Map();

  static startTerminal(userId, shell = 'bash', cols = 80, rows = 34) {
    // kills terminal if it already exists for the user
    if (UserTerminalManager.terminals.has(userId)) {
      UserTerminalManager.terminals.get(userId).kill();
    }
    const cwd = UserWorkspaceManager.getUserWorkspacePath(userId);
    // Force bash to run as interactive shell
    let shellCmd = shell;
    let shellArgs = [];
    if (shell.includes('bash')) {
      shellArgs = ['-i'];
    }
    const ptyProcess = pty.spawn(shellCmd, shellArgs, {
      name: 'xterm-color',
      cols,
      rows,
      cwd,
      env: {
        ...process.env,
        PS1: '\\w \\$ ',
      },
    });
    // Set prompt for bash or zsh after spawn
    setTimeout(() => {
      if (shell.includes('zsh')) {
        ptyProcess.write("export PROMPT='%~ %# '\n");
      } else if (shell.includes('bash')) {
        ptyProcess.write('export PS1="\\w \\$ "\n');
      }
    }, 100);
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
} 