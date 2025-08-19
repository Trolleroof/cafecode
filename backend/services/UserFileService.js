import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import path from 'path';
import { UserWorkspaceManager } from './UserWorkspaceManager.js';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

export class UserFileService {
  static resolveUserPath(userId, relPath) {
    const base = UserWorkspaceManager.getUserWorkspacePath(userId);
    const absPath = path.resolve(base, relPath);
    if (!absPath.startsWith(base)) {
      throw new Error('Access denied: Path escapes user workspace');
    }
    return absPath;
  }

  static readFile(userId, relPath, encoding = 'utf8') {
    const absPath = this.resolveUserPath(userId, relPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File not found: ${relPath}`);
    }
    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      throw new Error(`Path is a directory, not a file: ${relPath}`);
    }
    return fs.readFileSync(absPath, encoding);
  }

  static writeFile(userId, relPath, data, encoding = 'utf8') {
    const absPath = this.resolveUserPath(userId, relPath);
    // Ensure parent directory exists
    const parentDir = path.dirname(absPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(absPath, data, { encoding });
  }

  static deleteFile(userId, relPath) {
    const absPath = this.resolveUserPath(userId, relPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File or folder not found: ${relPath}`);
    }
    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      fs.rmSync(absPath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(absPath);
    }
  }

  // Alias for deleteFile for backward compatibility
  static deleteFileOrFolder(userId, relPath) {
    return this.deleteFile(userId, relPath);
  }

  static createFile(userId, relPath) {
    const absPath = this.resolveUserPath(userId, relPath);
    if (fs.existsSync(absPath)) {
      throw new Error(`File already exists: ${relPath}`);
    }
    // Ensure parent directory exists
    const parentDir = path.dirname(absPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(absPath, '');
  }

  static createFolder(userId, relPath) {
    const absPath = this.resolveUserPath(userId, relPath);
    if (fs.existsSync(absPath)) {
      throw new Error(`Folder already exists: ${relPath}`);
    }
    fs.mkdirSync(absPath, { recursive: true });
  }

  static renameFile(userId, oldPath, newPath) {
    const absOldPath = this.resolveUserPath(userId, oldPath);
    const absNewPath = this.resolveUserPath(userId, newPath);
    
    if (!fs.existsSync(absOldPath)) {
      throw new Error(`Source file or folder not found: ${oldPath}`);
    }
    if (fs.existsSync(absNewPath)) {
      throw new Error(`Destination already exists: ${newPath}`);
    }
    
    // Ensure parent directory of new path exists
    const parentDir = path.dirname(absNewPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    fs.renameSync(absOldPath, absNewPath);
  }

  static copyFileOrFolder(userId, sourcePath, destinationPath) {
    const absSourcePath = this.resolveUserPath(userId, sourcePath);
    const absDestPath = this.resolveUserPath(userId, destinationPath);
    
    if (!fs.existsSync(absSourcePath)) {
      throw new Error(`Source file or folder not found: ${sourcePath}`);
    }
    if (fs.existsSync(absDestPath)) {
      throw new Error(`Destination already exists: ${destinationPath}`);
    }
    
    // Ensure parent directory of destination exists
    const parentDir = path.dirname(absDestPath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    
    const stat = fs.statSync(absSourcePath);
    if (stat.isDirectory()) {
      this._copyDirectory(absSourcePath, absDestPath);
    } else {
      fs.copyFileSync(absSourcePath, absDestPath);
    }
  }

  static _copyDirectory(source, destination) {
    if (!fs.existsSync(destination)) {
      fs.mkdirSync(destination, { recursive: true });
    }
    
    const files = fs.readdirSync(source);
    for (const file of files) {
      const sourcePath = path.join(source, file);
      const destPath = path.join(destination, file);
      const stat = fs.statSync(sourcePath);
      
      if (stat.isDirectory()) {
        this._copyDirectory(sourcePath, destPath);
      } else {
        fs.copyFileSync(sourcePath, destPath);
      }
    }
  }

  static exists(userId, relPath) {
    try {
      const absPath = this.resolveUserPath(userId, relPath);
      return fs.existsSync(absPath);
    } catch (err) {
      return false;
    }
  }

  static getMetadata(userId, relPath) {
    const absPath = this.resolveUserPath(userId, relPath);
    if (!fs.existsSync(absPath)) {
      throw new Error(`File or folder not found: ${relPath}`);
    }
    
    const stat = fs.statSync(absPath);
    return {
      name: path.basename(relPath),
      path: relPath,
      size: stat.size,
      isDirectory: stat.isDirectory(),
      isFile: stat.isFile(),
      created: stat.birthtime,
      modified: stat.mtime,
      accessed: stat.atime,
      permissions: stat.mode,
    };
  }

  static listFiles(userId, relDir = '.', recursive = false) {
    const absDir = this.resolveUserPath(userId, relDir);
    if (!fs.existsSync(absDir)) {
      throw new Error(`Directory not found: ${relDir}`);
    }
    
    const stat = fs.statSync(absDir);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${relDir}`);
    }
    
    if (!recursive) {
      return fs.readdirSync(absDir).map(file => {
        const filePath = path.join(absDir, file);
        const fileStat = fs.statSync(filePath);
        return {
          name: relDir === '.' ? file : path.join(relDir, file),
          isDirectory: fileStat.isDirectory()
        };
      });
    }
    
    function walk(dir, relBase = '') {
      let results = [];
      try {
        const list = fs.readdirSync(dir);
        for (const file of list) {
          // Skip hidden files and system files
          if (file.startsWith('.') && !file.startsWith('.env')) {
            continue;
          }
          
          const absFile = path.join(dir, file);
          const relFile = relBase ? path.join(relBase, file) : file;
          
          try {
            const stat = fs.statSync(absFile);
            if (stat && stat.isDirectory()) {
              results.push({ name: relFile, isDirectory: true });
              results = results.concat(walk(absFile, relFile));
            } else {
              results.push({ name: relFile, isDirectory: false });
            }
          } catch (fileErr) {
            // Skip files that can't be accessed
            console.warn(`Skipping file due to access error: ${relFile}`, fileErr.message);
          }
        }
      } catch (dirErr) {
        console.warn(`Error reading directory: ${dir}`, dirErr.message);
      }
      return results;
    }
    
    return walk(absDir, relDir === '.' ? '' : relDir);
  }



  static listFilesDetailed(userId, relDir = '.', options = {}) {
    const {
      recursive = false,
      includeContent = false,
      maxBytes = 85536,
      extensions = [],
      ignoreHidden = true,
    } = options;

    const absDir = this.resolveUserPath(userId, relDir);
    if (!fs.existsSync(absDir)) {
      throw new Error(`Directory not found: ${relDir}`);
    }
    const stat = fs.statSync(absDir);
    if (!stat.isDirectory()) {
      throw new Error(`Path is not a directory: ${relDir}`);
    }

    const shouldIncludeFile = (fileName) => {
      if (ignoreHidden && fileName.startsWith('.') && !fileName.startsWith('.env')) return false;
      if (!extensions || extensions.length === 0) return true;
      const ext = path.extname(fileName).replace(/^\./, '').toLowerCase();
      // Handle files like Dockerfile with no dot
      if (!ext) {
        const base = path.basename(fileName).toLowerCase();
        return extensions.includes(base);
      }
      return extensions.includes(ext);
    };

    const safeRead = (absPath) => {
      try {
        const data = fs.readFileSync(absPath);
        if (data.length > maxBytes) {
          return data.subarray(0, maxBytes).toString('utf8');
        }
        return data.toString('utf8');
      } catch (e) {
        return null;
      }
    };

    const collect = (absBase, relBase = '') => {
      let results = [];
      const entries = fs.readdirSync(absBase);
      for (const entry of entries) {
        if (ignoreHidden && entry.startsWith('.') && !entry.startsWith('.env')) continue;
        const absEntry = path.join(absBase, entry);
        const relEntry = relBase ? path.join(relBase, entry) : entry;
        let s;
        try { s = fs.statSync(absEntry); } catch { continue; }
        const isDir = s.isDirectory();
        if (!isDir && !shouldIncludeFile(entry)) {
          // Skip by extension filter
          continue;
        }
        const item = {
          name: relEntry,
          isDirectory: isDir,
          size: s.size,
          modified: s.mtime,
          created: s.birthtime,
        };
        if (!isDir && includeContent) {
          item.content = safeRead(absEntry);
        }
        results.push(item);
        if (isDir && recursive) {
          results = results.concat(collect(absEntry, relEntry));
        }
      }
      return results;
    };

    return collect(absDir, relDir === '.' ? '' : relDir);
  }

  /**
   * Inspect a path and return type-specific info:
   * - if file: metadata + optional content
   * - if directory: children listing (optionally recursive)
   */
  static scanPath(userId, relPath = '.', options = {}) {
    const {
      recursive = false,
      includeContent = false,
      maxBytes = 65536,
      extensions = [],
      ignoreHidden = true,
    } = options;

    const absPath = this.resolveUserPath(userId, relPath);
    if (!fs.existsSync(absPath)) {
      return { exists: false, path: relPath };
    }
    const s = fs.statSync(absPath);
    if (s.isDirectory()) {
      const files = this.listFilesDetailed(userId, relPath, {
        recursive,
        includeContent,
        maxBytes,
        extensions,
        ignoreHidden,
      });
      return { exists: true, isDirectory: true, path: relPath, files };
    }

    // File case
    let content = null;
    if (includeContent) {
      try {
        const data = fs.readFileSync(absPath);
        content = data.length > maxBytes ? data.subarray(0, maxBytes).toString('utf8') : data.toString('utf8');
      } catch {
        content = null;
      }
    }
    return {
      exists: true,
      isDirectory: false,
      path: relPath,
      size: s.size,
      modified: s.mtime,
      created: s.birthtime,
      content,
    };
  }

  // Supabase-based file read
  static async readFileFromSupabase(userId, relPath) {
    const { data, error } = await supabase
      .from('user_files')
      .select('content')
      .eq('user_id', userId)
      .eq('path', relPath)
      .single();
    if (error) throw new Error(error.message);
    return data ? data.content : null;
  }

  // Supabase-based file write
  static async writeFileToSupabase(userId, relPath, content) {
    // Upsert file
    const { error } = await supabase
      .from('user_files')
      .upsert({ user_id: userId, path: relPath, content, updated_at: new Date().toISOString() }, { onConflict: ['user_id', 'path'] });
    if (error) throw new Error(error.message);
    return true;
  }

  // Read file: prefer Supabase, sync to local
  static async readFileSynced(userId, relPath, encoding = 'utf8') {
    // Try Supabase first
    let content = null;
    try {
      content = await this.readFileFromSupabase(userId, relPath);
      if (content !== null) {
        // Sync to local
        const absPath = this.resolveUserPath(userId, relPath);
        fs.mkdirSync(path.dirname(absPath), { recursive: true });
        fs.writeFileSync(absPath, content, { encoding });
        return content;
      }
    } catch (e) {
      // Ignore Supabase error, fallback to local
    }
    // Fallback: read from local
    return this.readFile(userId, relPath, encoding);
  }

  // Write file: write to both Supabase and local
  static async writeFileSynced(userId, relPath, data, encoding = 'utf8') {
    // Write to local disk first
    this.writeFile(userId, relPath, data, encoding);
    
    // Then try to sync to Supabase
    try {
      await this.writeFileToSupabase(userId, relPath, data);
    } catch (e) {
      console.warn('Failed to sync file to Supabase:', e.message);
      // Continue anyway - local file system is primary
    }
    
    return true;
  }
} 