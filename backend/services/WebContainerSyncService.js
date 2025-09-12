import crypto from 'crypto';
import { UserFileService } from './UserFileService.js';

function hash(content) {
  return crypto.createHash('sha1').update(content || '').digest('hex');
}

export class WebContainerSyncService {
  static async listAll(userId) {
    // Return files with metadata
    const items = UserFileService.listFilesDetailed(userId, '.', { recursive: true, includeContent: false, ignoreHidden: true });
    return items.map((it) => ({
      path: it.name,
      isDir: it.isDirectory,
      size: it.size,
      mtime: it.modified,
    }));
  }

  static async getRemoteContent(userId, filePath) {
    try {
      const content = await UserFileService.readFileSynced(userId, filePath);
      return { content, hash: hash(content) };
    } catch (e) {
      return { content: null, hash: null };
    }
  }

  /**
   * Apply batch of changes with naive conflict detection.
   * Change format: { op: 'upsert'|'delete', path, content?, isFolder?, baseRemoteHash? }
   */
  static async applyChanges(userId, changes = []) {
    const results = [];
    for (const ch of changes) {
      try {
        if (ch.op === 'delete') {
          await UserFileService.deleteFileOrFolder(userId, ch.path);
          results.push({ path: ch.path, ok: true });
          continue;
        }

        if (ch.isFolder) {
          await UserFileService.createFolder(userId, ch.path);
          results.push({ path: ch.path, ok: true });
          continue;
        }

        // Upsert file
        if (ch.baseRemoteHash) {
          const { hash: remoteHash } = await this.getRemoteContent(userId, ch.path);
          if (remoteHash && remoteHash !== ch.baseRemoteHash) {
            results.push({ path: ch.path, ok: false, conflict: true });
            continue;
          }
        }
        await UserFileService.writeFileSynced(userId, ch.path, ch.content || '');
        results.push({ path: ch.path, ok: true });
      } catch (e) {
        results.push({ path: ch.path, ok: false, error: e.message });
      }
    }
    return results;
  }
}

