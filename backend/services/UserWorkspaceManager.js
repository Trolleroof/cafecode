import fs from "fs";
import path from "path";

export class UserWorkspaceManager {
  // Always use the 'workspaces' folder in the current working directory as the workspace root
  static baseDir = path.join(process.cwd(), "workspaces");

  static getUserWorkspacePath(userId) {
    // Ensure the base workspaces directory exists
    if (!fs.existsSync(UserWorkspaceManager.baseDir)) {
      fs.mkdirSync(UserWorkspaceManager.baseDir, { recursive: true });
    }

    // Ensure the user directory exists inside the 'workspaces' folder
    const userDir = path.join(UserWorkspaceManager.baseDir, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });

      // Initialize workspace with a welcome file
      try {
        const welcomeFile = path.join(userDir, "READMEPLEASE.md");
        const welcomeContent = `# Welcome to Your Coding Workspace!

Thanks for exploring Cafécode! Here are some useful things you should know:

## Getting Started

1. Create a new file (e.g., \`main.py\`, \`app.js\`, \`index.html\`)
2. Write your code
3. Use the terminal to run your programs
4. Explore and experiment!

Happy coding! 🚀
`;
        fs.writeFileSync(welcomeFile, welcomeContent, "utf8");
      } catch (err) {
        console.warn("Failed to create welcome file:", err.message);
      }
    }
    return userDir;
  }

  // Returns the virtual path (as seen by the user) relative to their workspace root
  static getVirtualPath(realPath, userId) {
    const workspaceRoot = path.join(UserWorkspaceManager.baseDir, userId);
    let relative = path.relative(workspaceRoot, realPath);
    if (!relative || relative === "") return "/";
    return "/" + relative.replace(/\\/g, "/"); // Ensure forward slashes
  }

  // Returns the root directory for the terminal, abstracted for the user
  static getTerminalRoot(userId) {
    if (
      process.env.NODE_ENV === "development" ||
      process.env.LOCAL_TERMINAL_ROOT === "1"
    ) {
      // Local: allow access to all workspaces but start in user workspace
      return UserWorkspaceManager.getUserWorkspacePath(userId);
    } else {
      // Production: restrict to user workspace
      return UserWorkspaceManager.getUserWorkspacePath(userId);
    }
  }

  // Get workspace statistics
  static getWorkspaceStats(userId) {
    const userDir = UserWorkspaceManager.getUserWorkspacePath(userId);
    try {
      const stats = fs.statSync(userDir);
      const fileCount = this._countFiles(userDir);

      return {
        created: stats.birthtime,
        modified: stats.mtime,
        size: this._getDirectorySize(userDir),
        fileCount: fileCount.files,
        folderCount: fileCount.folders,
      };
    } catch (err) {
      return null;
    }
  }

  // Helper method to count files and folders recursively
  static _countFiles(dir) {
    let files = 0;
    let folders = 0;

    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          folders++;
          const subCounts = this._countFiles(itemPath);
          files += subCounts.files;
          folders += subCounts.folders;
        } else {
          files++;
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }

    return { files, folders };
  }

  // Helper method to get directory size
  static _getDirectorySize(dir) {
    let size = 0;

    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          size += this._getDirectorySize(itemPath);
        } else {
          size += stat.size;
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }

    return size;
  }

  // Clean up old or inactive workspaces
  static cleanupWorkspaces(maxAgeHours = 72) {
    try {
      const items = fs.readdirSync(UserWorkspaceManager.baseDir);
      const cutoffTime = Date.now() - maxAgeHours * 60 * 60 * 1000;

      for (const item of items) {
        const itemPath = path.join(UserWorkspaceManager.baseDir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory() && stat.mtime.getTime() < cutoffTime) {
          console.log(`Cleaning up old workspace: ${item}`);
          fs.rmSync(itemPath, { recursive: true, force: true });
        }
      }
    } catch (err) {
      console.warn("Failed to cleanup workspaces:", err.message);
    }
  }
}
