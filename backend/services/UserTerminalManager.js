import pty from 'node-pty';
import { UserWorkspaceManager } from './UserWorkspaceManager.js';
import fs from 'fs';
import path from 'path';

export class UserTerminalManager {
  // Map of userId -> Map of terminalId -> PTY process
  static userIdToTerminals = new Map();

  static startTerminal(userId, shell = 'bash', cols = 90, rows = 34, terminalId = null) {
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
    
    // Essential environment setup for terminal functionality
    const env = {
      ...process.env,
      TERM: 'xterm-color',
      PS1: '$ ',
    };
    
    const ptyProcess = pty.spawn('bash', ['-i'], {
      name: 'xterm-color',
      cols,
      rows,
      cwd,
      env,
    });
    
    // Optimized initial setup with proper directory handling
    setTimeout(() => {
      // Ensure we're in the correct directory and verify it
      ptyProcess.write(`cd "${cwd}"\n`);
      ptyProcess.write('export PS1="$ "\n');
      
      // Verify we're in the right place and set proper context
      ptyProcess.write('if [ "$PWD" != "' + cwd + '" ]; then\n');
      ptyProcess.write('  echo "Warning: Not in expected directory. Fixing..."\n');
      ptyProcess.write('  cd "' + cwd + '"\n');
      ptyProcess.write('fi\n');
    
      
      // Add helpful function to find and navigate to project directories
      ptyProcess.write('find-project() {\n');
      ptyProcess.write('  if [ -n "$1" ]; then\n');
      ptyProcess.write('    local dir=$(find . -name "$1" -type d 2>/dev/null | head -1)\n');
      ptyProcess.write('    if [ -n "$dir" ]; then\n');
      ptyProcess.write('      echo "Found project directory: $dir"\n');
      ptyProcess.write('      cd "$dir"\n');
      ptyProcess.write('      echo "Changed to: $(pwd)"\n');
      ptyProcess.write('      # Check if this is a valid project directory\n');
      ptyProcess.write('      if [ -f "package.json" ]; then\n');
      ptyProcess.write('        echo "✓ Valid Node.js project found"\n');
      ptyProcess.write('      fi\n');
      ptyProcess.write('    else\n');
      ptyProcess.write('      echo "No directory named \'$1\' found"\n');
      ptyProcess.write('    fi\n');
      ptyProcess.write('  else\n');
      ptyProcess.write('    echo "Usage: find-project <directory-name>"\n');
      ptyProcess.write('    echo "Example: find-project my-vite-app"\n');
      ptyProcess.write('  fi\n');
      ptyProcess.write('}\n');
      

      
      // Add function to check current directory status
      ptyProcess.write('check-project() {\n');
      ptyProcess.write('  echo "Current directory: $(pwd)"\n');
      ptyProcess.write('  if [ -f "package.json" ]; then\n');
      ptyProcess.write('    echo "✓ This is a Node.js project"\n');
      ptyProcess.write('    if command -v jq >/dev/null 2>&1; then\n');
      ptyProcess.write('      local name=$(jq -r ".name // \\"unknown\\"" package.json 2>/dev/null)\n');
      ptyProcess.write('      echo "Project name: $name"\n');
      ptyProcess.write('      echo "Available scripts:"\n');
      ptyProcess.write('      jq -r ".scripts | keys[]" package.json 2>/dev/null | sed "s/^/  - npm run /" || echo "  No scripts found"\n');
      ptyProcess.write('    fi\n');
      ptyProcess.write('  else\n');
      ptyProcess.write('    echo "⚠ No package.json found - not in a Node.js project directory"\n');
      ptyProcess.write('    echo "Use auto-project or find-project to navigate to your project"\n');
      ptyProcess.write('  fi\n');
      ptyProcess.write('}\n');
      
      // Add function to start development servers with proper network binding
      ptyProcess.write('start-dev() {\n');
      ptyProcess.write('  if [ -f "package.json" ]; then\n');
      ptyProcess.write('    echo "🚀 Starting development server with proper network binding..."\n');
      ptyProcess.write('    if grep -q "vite" package.json; then\n');
      ptyProcess.write('      echo "📦 Detected Vite project - starting with host binding"\n');
      ptyProcess.write('      npm run dev -- --host 0.0.0.0\n');
      ptyProcess.write('    elif grep -q "next" package.json; then\n');
      ptyProcess.write('      echo "📦 Detected Next.js project - starting with host binding"\n');
      ptyProcess.write('      npm run dev -- --hostname 0.0.0.0\n');
      ptyProcess.write('    elif grep -q "react-scripts" package.json; then\n');
      ptyProcess.write('      echo "📦 Detected Create React App - starting with host binding"\n');
      ptyProcess.write('      HOST=0.0.0.0 npm start\n');
      ptyProcess.write('    else\n');
      ptyProcess.write('      echo "📦 Starting with default npm run dev"\n');
      ptyProcess.write('      npm run dev\n');
      ptyProcess.write('    fi\n');
      ptyProcess.write('  else\n');
      ptyProcess.write('    echo "❌ No package.json found. Make sure you are in a Node.js project directory."\n');
      ptyProcess.write('    echo "Use find-project <project-name> to navigate to your project"\n');
      ptyProcess.write('  fi\n');
      ptyProcess.write('}\n');
      
      
      // Configure environment for development servers
      // Disable browser opening but allow proper network binding
      ptyProcess.write('export BROWSER=none\n');
      ptyProcess.write('export REACT_EDITOR=none\n');
      ptyProcess.write('export EDITOR=none\n');
      ptyProcess.write('npm config set browser none\n');
      
      // Enable proper network binding for development servers
      ptyProcess.write('export VITE_HOST=0.0.0.0\n');
      ptyProcess.write('export NEXT_TELEMETRY_DISABLED=1\n');
      ptyProcess.write('export WATCHPACK_POLLING=true\n');
      
      ptyProcess.write('clear\n');
    }, 300); // Increased timing for better initialization 
    
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