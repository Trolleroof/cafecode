import fs from 'fs';
import path from 'path';

// Heavy directories to ignore during scans and watcher events
const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  'build',
  'dist',
  'out',
  'coverage',
  '.turbo',
  '.cache',
  'tmp',
  '.vite',
  '.nuxt',
  '.svelte-kit',
]);

const isIgnoredPath = (p) => {
  if (!p) return false;
  try {
    const segments = p.split(/[\\\/]/);
    return segments.some((seg) => IGNORED_DIRS.has(seg));
  } catch (_) {
    return false;
  }
};


export class FileSystemIndexer {
  constructor() {
    // In-memory cache: userId -> { files: Set, folders: Set, fullPaths: Map }
    this.userIndexes = new Map();
    // Watchers for file system changes: userId -> FSWatcher
    this.watchers = new Map();
    // Cache expiry: userId -> timestamp
    this.lastUpdated = new Map();
    
    // Cache duration: 30 minutes (increased from 5 minutes to reduce spam)
    this.CACHE_DURATION = 30 * 60 * 1000;
    
    // Debounce file change events to reduce spam
    this.changeDebouncers = new Map();
    this.DEBOUNCE_DELAY = 2000; // 2 seconds to reduce spam further
    
    // Track file changes to batch them
    this.pendingChanges = new Map();
    this.BATCH_DELAY = 5000; // 5 seconds to batch changes
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
    // Only log when building a new index, not when using cached one
    if (!this.userIndexes.has(userId)) {
      console.log(`[FS_INDEXER] Building file system index for user: ${userId}`);
    }
    const index = this.buildIndex(workspacePath);
    this.userIndexes.set(userId, index);
    this.lastUpdated.set(userId, now);
    
    // Set up file watcher for real-time updates (only once per user)
    if (!this.watchers.has(userId)) {
      this.setupWatcher(userId, workspacePath);
    }
    
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

          // Skip heavy/ignored directories and their contents
          if (IGNORED_DIRS.has(item.name) || isIgnoredPath(itemRelPath)) {
            continue;
          }
          
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
    
    // Only log significant index builds to reduce spam
    if (files.size > 0 || folders.size > 0) {
      console.log(`[FS_INDEXER] Index built: ${files.size} files, ${folders.size} folders`);
    }
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
        if (
          filename &&
          !filename.startsWith('.') &&
          !filename.startsWith('_') &&
          !isIgnoredPath(filename)
        ) {
          // Debounce file change events to reduce spam
          this.debounceFileChange(userId, eventType, filename, workspacePath);
        }
      });
      
      this.watchers.set(userId, watcher);
    } catch (error) {
      console.warn(`[FS_INDEXER] Could not setup watcher for ${userId}:`, error.message);
    }
  }

  /**
   * Debounce file change events to reduce spam
   */
  debounceFileChange(userId, eventType, filename, workspacePath) {
    // Track this change
    if (!this.pendingChanges.has(userId)) {
      this.pendingChanges.set(userId, new Set());
    }
    
    const changes = this.pendingChanges.get(userId);
    changes.add({ eventType, filename, workspacePath });
    
    // Clear existing debouncer
    if (this.changeDebouncers.has(userId)) {
      clearTimeout(this.changeDebouncers.get(userId));
    }

    // Set new debouncer with longer delay for batching
    const debouncer = setTimeout(() => {
      this.processBatchedChanges(userId);
      this.changeDebouncers.delete(userId);
    }, this.BATCH_DELAY);

    this.changeDebouncers.set(userId, debouncer);
  }

  /**
   * Process batched file changes to reduce spam
   */
  processBatchedChanges(userId) {
    const changes = this.pendingChanges.get(userId);
    if (!changes || changes.size === 0) return;
    
    // Process all pending changes at once
    const processedChanges = new Set();
    
    for (const change of changes) {
      const { eventType, filename, workspacePath } = change;
      const changeKey = `${eventType}-${filename}`;
      
      if (!processedChanges.has(changeKey)) {
        this.processFileChange(userId, eventType, filename, workspacePath);
        processedChanges.add(changeKey);
      }
    }
    
    // Clear processed changes
    this.pendingChanges.delete(userId);
  }

  /**
   * Process individual file change
   */
  processFileChange(userId, eventType, filename, workspacePath) {
    // Determine the type of change and get more details
    let changeType = 'unknown';
    let filePath = filename;
    
    try {
      const fullPath = path.join(workspacePath, filename);
      const stats = fs.statSync(fullPath);
      
      if (eventType === 'rename') {
        // Check if file exists to determine if it was created or deleted
        if (fs.existsSync(fullPath)) {
          changeType = 'created';
        } else {
          changeType = 'deleted';
        }
      } else if (eventType === 'change') {
        changeType = 'modified';
      }
      
      // Get relative path from workspace
      const relativePath = path.relative(workspacePath, fullPath);
      filePath = relativePath;
      
      // Emit custom event for WebSocket broadcasting
      if (this.onFileChange) {
        this.onFileChange(userId, {
          type: changeType,
          path: filePath,
          filename: filename,
          isDirectory: stats.isDirectory(),
          size: stats.size,
          timestamp: new Date().toISOString()
        });
      }
      
    } catch (error) {
      // File might have been deleted or moved
      if (eventType === 'rename') {
        changeType = 'deleted';
      }
      
      // Emit event even if we can't get stats
      if (this.onFileChange) {
        this.onFileChange(userId, {
          type: changeType,
          path: filePath,
          filename: filename,
          timestamp: new Date().toISOString()
        });
      }
    }
    
    // Only invalidate cache periodically, not on every change
    const now = Date.now();
    const lastUpdate = this.lastUpdated.get(userId) || 0;
    // TEMPORARY: Reduced to 1 minute for testing (was 24 minutes)
    // Only invalidate if cache is older than 1 minute
    if ((now - lastUpdate) > (60 * 1000)) {
      this.lastUpdated.set(userId, 0);
    }
  }

  /**
   * Set callback for file change events
   */
  setFileChangeCallback(callback) {
    this.onFileChange = callback;
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
    

    const fileNameOnly = path.basename(normalizedName);
    
    
    for (const [fullPath, info] of index.fullPaths) {
      if (info.name.toLowerCase() === fileNameOnly) {
        if (!expectedType || info.type === expectedType) {
          return {
            exists: true,
            type: info.type,
            actualName: info.name,
            relativePath: info.relativePath
          };
        }
      }
    }
    
    
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
    
    // Clear any pending debouncers
    if (this.changeDebouncers.has(userId)) {
      clearTimeout(this.changeDebouncers.get(userId));
      this.changeDebouncers.delete(userId);
    }
    
    // Clear pending changes
    this.pendingChanges.delete(userId);
    
    this.userIndexes.delete(userId);
    this.lastUpdated.delete(userId);
    console.log(`[FS_INDEXER] Cleaned up resources for user: ${userId}`);
  }

  /**
   * Immediately invalidate and rebuild cache for a user
   * This is called when files are created/deleted to ensure immediate consistency
   */
  invalidateUserCache(userId) {
    console.log(`🔄 [FS_INDEXER] Immediately invalidating cache for user: ${userId}`);
    this.lastUpdated.set(userId, 0); // Force cache rebuild on next access
    // Optionally, immediately rebuild the cache
    if (this.userIndexes.has(userId)) {
      this.userIndexes.delete(userId);
    }
  }

  /**
   * Add a file to the cache immediately (for optimistic updates)
   */
  addFileToCache(userId, filePath, isFolder = false) {
    const index = this.userIndexes.get(userId);
    if (!index) return; // Cache doesn't exist yet, will be built on next access
    
    const normalizedPath = filePath.toLowerCase().replace(/^\.\//, '');
    const fileName = path.basename(filePath);
    
    if (isFolder) {
      index.folders.add(fileName.toLowerCase());
      index.folders.add(normalizedPath);
      index.fullPaths.set(normalizedPath, {
        type: 'folder',
        relativePath: filePath,
        name: fileName
      });
    } else {
      index.files.add(fileName.toLowerCase());
      index.files.add(normalizedPath);
      index.fullPaths.set(normalizedPath, {
        type: 'file',
        relativePath: filePath,
        name: fileName
      });
    }
    
    console.log(`➕ [FS_INDEXER] Added ${isFolder ? 'folder' : 'file'} to cache: ${filePath}`);
  }

  /**
   * Remove a file from the cache immediately
   */
  removeFileFromCache(userId, filePath) {
    const index = this.userIndexes.get(userId);
    if (!index) return;
    
    const normalizedPath = filePath.toLowerCase().replace(/^\.\//, '');
    const fileName = path.basename(filePath);
    
    index.files.delete(fileName.toLowerCase());
    index.files.delete(normalizedPath);
    index.folders.delete(fileName.toLowerCase());
    index.folders.delete(normalizedPath);
    index.fullPaths.delete(normalizedPath);
    
    console.log(`➖ [FS_INDEXER] Removed file from cache: ${filePath}`);
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
