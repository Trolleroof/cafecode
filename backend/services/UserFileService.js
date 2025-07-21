import fs from 'fs';
import path from 'path';
import { UserWorkspaceManager } from './UserWorkspaceManager.js';

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
    return fs.readFileSync(absPath, encoding);
  }

  static writeFile(userId, relPath, data, encoding = 'utf8') {
    const absPath = this.resolveUserPath(userId, relPath);
    fs.writeFileSync(absPath, data, { encoding });
  }

  static deleteFile(userId, relPath) {
    const absPath = this.resolveUserPath(userId, relPath);
    fs.unlinkSync(absPath);
  }

  static createFile(userId, relPath) {
    const absPath = this.resolveUserPath(userId, relPath);
    fs.writeFileSync(absPath, '');
  }

  static createFolder(userId, relPath) {
    const absPath = this.resolveUserPath(userId, relPath);
    fs.mkdirSync(absPath, { recursive: true });
  }

  static renameFile(userId, oldPath, newPath) {
    const absOldPath = this.resolveUserPath(userId, oldPath);
    const absNewPath = this.resolveUserPath(userId, newPath);
    fs.renameSync(absOldPath, absNewPath);
  }

  static listFiles(userId, relDir = '.', recursive = false) {
    const absDir = this.resolveUserPath(userId, relDir);
    if (!recursive) {
      return fs.readdirSync(absDir);
    }
    function walk(dir, relBase = '') {
      let results = [];
      const list = fs.readdirSync(dir);
      for (const file of list) {
        const absFile = path.join(dir, file);
        const relFile = path.join(relBase, file);
        const stat = fs.statSync(absFile);
        if (stat && stat.isDirectory()) {
          results.push({ name: relFile, isDirectory: true });
          results = results.concat(walk(absFile, relFile));
        } else {
          results.push({ name: relFile, isDirectory: false });
        }
      }
      return results;
    }
    return walk(absDir);
  }
} 