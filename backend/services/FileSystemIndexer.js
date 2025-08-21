import fs from 'fs';
import path from 'path';


export class FileSystemIndexer {
  constructor() {
    // In-memory cache: userId -> { files: Set, folders: Set, fullPaths: Map }
    this.userIndexes = new Map();
    // Watchers for file system changes: userId -> FSWatcher
    this.watchers = new Map();
    // Cache expiry: userId -> timestamp
    this.lastUpdated = new Map();
    
    // Cache duration: 5 minutes
    this.CACHE_DURATION = 5 * 60 * 1000;
  }

  /**
   * Get or build index for a user's workspace
   */
  getUserIndex(userId, workspacePath) {
    const now = Date.now();
    const lastUpdate = this.lastUpdated.get(userId) || 0;
    
    // Check if cache is still valid
    if (this.userIndexes.has(userId) && (now - lastUpdate) < this.CACHE_DURATION) {
      return this.userIndexes.get(userId);
    }
    
    // Rebuild index
    console.log(`[FS_INDEXER] Building file system index for user: ${userId}`);
    const index = this.buildIndex(workspacePath);
    this.userIndexes.set(userId, index);
    this.lastUpdated.set(userId, now);
    
    // Set up file watcher for real-time updates
    this.setupWatcher(userId, workspacePath);
    
    return index;
  }

  /**
   * Build complete file system index
   */
  buildIndex(workspacePath) {
    const files = new Set();
    const folders = new Set();
    const fullPaths = new Map(); // path -> { type: 'file'|'folder', relativePath: string }

    if (!fs.existsSync(workspacePath)) {
      return { files, folders, fullPaths };
    }

    const scanDirectory = (dirPath, relativePath = '') => {
      try {
        const items = fs.readdirSync(dirPath, { withFileTypes: true });
        
        for (const item of items) {
          // Skip hidden files and system files
          if (item.name.startsWith('.') || item.name.startsWith('_')) {
            continue;
          }
          
          const itemRelPath = relativePath ? `${relativePath}/${item.name}` : item.name;
          const itemFullPath = path.join(dirPath, item.name);
          
          if (item.isDirectory()) {
            // Add folder to index
            folders.add(item.name.toLowerCase());
            folders.add(itemRelPath.toLowerCase());
            fullPaths.set(itemRelPath.toLowerCase(), {
              type: 'folder',
              relativePath: itemRelPath,
              name: item.name
            });
            
            // Recursively scan subdirectories
            scanDirectory(itemFullPath, itemRelPath);
          } else if (item.isFile()) {
            // Add file to index
            files.add(item.name.toLowerCase());
            files.add(itemRelPath.toLowerCase());
            fullPaths.set(itemRelPath.toLowerCase(), {
              type: 'file',
              relativePath: itemRelPath,
              name: item.name
            });
          }
        }
      } catch (error) {
        console.warn(`[FS_INDEXER] Error scanning ${dirPath}:`, error.message);
      }
    };

    scanDirectory(workspacePath);
    
    console.log(`[FS_INDEXER] Index built: ${files.size} files, ${folders.size} folders`);
    return { files, folders, fullPaths };
  }

  /**
   * Setup file system watcher for real-time updates
   */
  setupWatcher(userId, workspacePath) {
    // Clean up existing watcher
    if (this.watchers.has(userId)) {
      this.watchers.get(userId).close();
    }

    try {
      const watcher = fs.watch(workspacePath, { recursive: true }, (eventType, filename) => {
        if (filename && !filename.startsWith('.') && !filename.startsWith('_')) {
          console.log(`[FS_INDEXER] File system change detected for user ${userId}: ${eventType} ${filename}`);
          // Invalidate cache on next access
          this.lastUpdated.set(userId, 0);
        }
      });
      
      this.watchers.set(userId, watcher);
    } catch (error) {
      console.warn(`[FS_INDEXER] Could not setup watcher for ${userId}:`, error.message);
    }
  }

  /**
   * Check if a file exists in the user's workspace
   */
  fileExists(userId, workspacePath, fileName) {
    const index = this.getUserIndex(userId, workspacePath);
    const normalizedName = fileName.toLowerCase().replace(/^\.\//, '');
    
    return index.files.has(normalizedName) || 
           index.fullPaths.has(normalizedName)?.type === 'file';
  }

  /**
   * Check if a folder exists in the user's workspace
   */
  folderExists(userId, workspacePath, folderName) {
    const index = this.getUserIndex(userId, workspacePath);
    const normalizedName = folderName.toLowerCase().replace(/^\.\//, '');
    
    return index.folders.has(normalizedName) || 
           index.fullPaths.has(normalizedName)?.type === 'folder';
  }

  /**
   * Enhanced existence check with type detection
   */
  checkExistence(userId, workspacePath, targetName, expectedType = null) {
    const index = this.getUserIndex(userId, workspacePath);
    const normalizedName = targetName.toLowerCase().replace(/^\.\//, '');
    
    // Check direct matches
    const pathInfo = index.fullPaths.get(normalizedName);
    if (pathInfo) {
      if (!expectedType || pathInfo.type === expectedType) {
        return {
          exists: true,
          type: pathInfo.type,
          actualName: pathInfo.name,
          relativePath: pathInfo.relativePath
        };
      }
    }
    
    // Check partial matches (just filename without path)
    const fileNameOnly = path.basename(normalizedName);
    
    if (expectedType === 'file' || !expectedType) {
      if (index.files.has(fileNameOnly)) {
        return {
          exists: true,
          type: 'file',
          actualName: fileNameOnly,
          relativePath: fileNameOnly
        };
      }
    }
    
    if (expectedType === 'folder' || !expectedType) {
      if (index.folders.has(fileNameOnly)) {
        return {
          exists: true,
          type: 'folder',
          actualName: fileNameOnly,
          relativePath: fileNameOnly
        };
      }
    }
    
    return {
      exists: false,
      type: null,
      actualName: null,
      relativePath: null
    };
  }

  /**
   * Get all files and folders in workspace (for debugging)
   */
  getAllItems(userId, workspacePath) {
    const index = this.getUserIndex(userId, workspacePath);
    return {
      files: Array.from(index.files),
      folders: Array.from(index.folders),
      totalItems: index.files.size + index.folders.size
    };
  }

  /**
   * Clean up resources for a user
   */
  cleanup(userId) {
    if (this.watchers.has(userId)) {
      this.watchers.get(userId).close();
      this.watchers.delete(userId);
    }
    this.userIndexes.delete(userId);
    this.lastUpdated.delete(userId);
    console.log(`[FS_INDEXER] Cleaned up resources for user: ${userId}`);
  }

  /**
   * Clean up all resources
   */
  cleanupAll() {
    for (const [userId] of this.userIndexes) {
      this.cleanup(userId);
    }
  }
}

// Singleton instance
export const fileSystemIndexer = new FileSystemIndexer();

// Cleanup on process exit
process.on('exit', () => fileSystemIndexer.cleanupAll());
process.on('SIGINT', () => {
  fileSystemIndexer.cleanupAll();
  process.exit(0);
});
