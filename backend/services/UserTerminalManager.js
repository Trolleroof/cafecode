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
      // Enable browser auto-opening
      BROWSER: 'xdg-open', // Enable browser auto-opening
      REACT_EDITOR: 'xdg-open', // Enable React editor auto-opening
      EDITOR: 'xdg-open', // Enable editor auto-opening
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
      
      // Add function to automatically detect and navigate to project root
      ptyProcess.write('auto-project() {\n');
      ptyProcess.write('  # Look for package.json in current directory first\n');
      ptyProcess.write('  if [ -f "package.json" ]; then\n');
      ptyProcess.write('    echo "✓ Already in project directory: $(pwd)"\n');
      ptyProcess.write('    return 0\n');
      ptyProcess.write('  fi\n');
      ptyProcess.write('  # Look for project directories with package.json\n');
      ptyProcess.write('  local project_file=$(find . -maxdepth 3 -name "package.json" -type f 2>/dev/null | head -1)\n');
      ptyProcess.write('  if [ -n "$project_file" ]; then\n');
      ptyProcess.write('    local project_dir=$(dirname "$project_file")\n');
      ptyProcess.write('    echo "Found project in: $project_dir"\n');
      ptyProcess.write('    cd "$project_dir"\n');
      ptyProcess.write('    echo "✓ Changed to project directory: $(pwd)"\n');
      ptyProcess.write('    # Show available scripts\n');
      ptyProcess.write('    if command -v jq >/dev/null 2>&1; then\n');
      ptyProcess.write('      echo "Available scripts:"\n');
      ptyProcess.write('      jq -r ".scripts | keys[]" package.json 2>/dev/null | sed "s/^/  - npm run /"\n');
      ptyProcess.write('    fi\n');
      ptyProcess.write('  else\n');
      ptyProcess.write('    echo "No project found with package.json in current or subdirectories"\n');
      ptyProcess.write('    echo "Try: find-project <project-name>"\n');
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
      
      // Set up browser opening with multiple fallback methods
      ptyProcess.write('export BROWSER=xdg-open\n');
      ptyProcess.write('export REACT_EDITOR=xdg-open\n');
      ptyProcess.write('export EDITOR=xdg-open\n');
      
      // Create a robust browser opening function with multiple fallbacks
      ptyProcess.write('open-browser() {\n');
      ptyProcess.write('  local url="$1"\n');
      ptyProcess.write('  if [ -z "$url" ]; then\n');
      ptyProcess.write('    echo "Usage: open-browser <url>"\n');
      ptyProcess.write('    return 1\n');
      ptyProcess.write('  fi\n');
      ptyProcess.write('  \n');
      ptyProcess.write('  echo "🌐 Opening browser: $url"\n');
      ptyProcess.write('  \n');
      ptyProcess.write('  # Try multiple methods in order of preference\n');
      ptyProcess.write('  if command -v xdg-open >/dev/null 2>&1; then\n');
      ptyProcess.write('    xdg-open "$url" 2>/dev/null && echo "✓ Opened with xdg-open" && return 0\n');
      ptyProcess.write('  fi\n');
      ptyProcess.write('  \n');
      ptyProcess.write('  if command -v python3 >/dev/null 2>&1; then\n');
      ptyProcess.write('    python3 -m webbrowser "$url" 2>/dev/null && echo "✓ Opened with python3 webbrowser" && return 0\n');
      ptyProcess.write('  fi\n');
      ptyProcess.write('  \n');
      ptyProcess.write('  if command -v python >/dev/null 2>&1; then\n');
      ptyProcess.write('    python -m webbrowser "$url" 2>/dev/null && echo "✓ Opened with python webbrowser" && return 0\n');
      ptyProcess.write('  fi\n');
      ptyProcess.write('  \n');
      ptyProcess.write('  if command -v curl >/dev/null 2>&1; then\n');
      ptyProcess.write('    curl -s "$url" >/dev/null 2>&1 && echo "✓ URL is accessible via curl" && return 0\n');
      ptyProcess.write('  fi\n');
      ptyProcess.write('  \n');
      ptyProcess.write('  echo "⚠ Could not open browser automatically"\n');
      ptyProcess.write('  echo "📋 Please manually open: $url"\n');
      ptyProcess.write('  echo "💡 Or copy this URL to your browser"\n');
      ptyProcess.write('}\n');
      
      // Install xdg-utils with --fix-missing flag (based on user discovery)
      ptyProcess.write('if ! which xdg-open >/dev/null 2>&1; then\n');
      ptyProcess.write('  echo "🔧 Installing xdg-utils for browser opening..."\n');
      ptyProcess.write('  if command -v sudo >/dev/null 2>&1; then\n');
      ptyProcess.write('    sudo apt-get update >/dev/null 2>&1 && sudo apt-get install -y xdg-utils --fix-missing >/dev/null 2>&1 && echo "✓ xdg-utils installed successfully" || echo "⚠ Could not install xdg-utils with sudo"\n');
      ptyProcess.write('  else\n');
      ptyProcess.write('    echo "⚠ sudo not available, trying alternative installation..."\n');
      ptyProcess.write('    apt-get update >/dev/null 2>&1 && apt-get install -y xdg-utils --fix-missing >/dev/null 2>&1 && echo "✓ xdg-utils installed successfully" || echo "⚠ Could not install xdg-utils"\n');
      ptyProcess.write('  fi\n');
      ptyProcess.write('else\n');
      ptyProcess.write('  echo "✓ xdg-utils already available"\n');
      ptyProcess.write('fi\n');
      
      
      // Run auto-project to ensure we're in the right place
      ptyProcess.write('auto-project\n');
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