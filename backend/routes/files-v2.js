import express from 'express';
import { UserFileService } from '../services/UserFileService.js';
import { Cache, SimpleCache } from '../services/Cache.js';
import multer from 'multer';
import crypto from 'crypto';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Cache configuration
const CACHE_TTL = 30000; // 30 seconds
const FILE_CONTENT_CACHE_TTL = 20000; // 20 seconds

/**
 * GET /api/v2/files?recursive=1&withContent=0
 * Returns flat array of files with metadata
 */
router.get('/files', async (req, res) => {
  try {
    const userId = req.user.id;
    const recursive = req.query.recursive === '1' || req.query.recursive === 'true';
    const withContent = req.query.withContent === '1' || req.query.withContent === 'true';
    
    // Simple cache key
    const cacheKey = `v2:files:${userId}:${recursive}:${withContent}`;
    const cached = await Cache.get(cacheKey);
    
    if (cached && !withContent) { // Only cache non-content requests
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }
    
    // Get file list
    const files = await UserFileService.listFiles(userId, '.', recursive);
    
    // Transform to simplified format
    const result = files.map(file => {
      const metadata = {
        path: file.name,
        isDir: file.isDirectory,
        size: 0,
        mtime: new Date().toISOString()
      };
      
      // Add size/mtime if available (would need to enhance listFiles)
      if (!file.isDirectory) {
        try {
          const stats = UserFileService.getMetadata(userId, file.name);
          metadata.size = stats.size || 0;
          metadata.mtime = stats.modified || metadata.mtime;
        } catch (e) {
          // Ignore stat errors
        }
      }
      
      // Add content if requested (not recommended for large trees)
      if (withContent && !file.isDirectory) {
        try {
          metadata.content = UserFileService.readFile(userId, file.name);
        } catch (e) {
          metadata.content = null;
        }
      }
      
      return metadata;
    });
    
    // Generate ETag based on file list content
    const etagData = JSON.stringify(result.map(f => ({ p: f.path, s: f.size, m: f.mtime })));
    const etag = `"${crypto.createHash('md5').update(etagData).digest('hex')}"`;
    
    // Check if client has matching ETag
    const clientETag = req.headers['if-none-match'];
    if (clientETag && clientETag === etag) {
      res.status(304).end(); // Not Modified
      return;
    }
    
    // Cache the result
    if (!withContent) {
      await Cache.set(cacheKey, result, { ttlMs: CACHE_TTL });
    }
    
    res.set('X-Cache', 'MISS');
    res.set('ETag', etag);
    res.json(result);
  } catch (err) {
    console.error('Files list error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/v2/file/:path
 * Read a single file's content
 */
router.get('/file/*', async (req, res) => {
  try {
    const userId = req.user.id;
    const filePath = req.params[0]; // Everything after /file/
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    // Cache small files
    const cacheKey = `v2:file:${userId}:${filePath}`;
    const cached = await Cache.get(cacheKey);
    
    if (cached) {
      res.set('X-Cache', 'HIT');
      return res.json({ content: cached });
    }
    
    const content = await UserFileService.readFileSynced(userId, filePath);
    
    // Cache if small enough (< 128KB)
    if (content.length < 131072) {
      await Cache.set(cacheKey, content, { ttlMs: FILE_CONTENT_CACHE_TTL });
    }
    
    res.set('X-Cache', 'MISS');
    res.json({ content });
  } catch (err) {
    console.error('File read error:', err);
    res.status(404).json({ error: err.message });
  }
});

/**
 * PUT /api/v2/file/:path
 * Write/update a file
 */
router.put('/file/*', async (req, res) => {
  try {
    const userId = req.user.id;
    const filePath = req.params[0];
    const { content } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    await UserFileService.writeFileSynced(userId, filePath, content || '');
    
    // Invalidate caches
    await Cache.invalidateUserPath(userId, filePath);
    await Cache.invalidateByTags([SimpleCache.createTagUser(userId)]);
    
    // Broadcast file update event
    if (req.app.locals.broadcastFileEvent) {
      req.app.locals.broadcastFileEvent(userId, {
        type: 'file:updated',
        path: filePath,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('File write error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/v2/file/:path
 * Delete a file or folder
 */
router.delete('/file/*', async (req, res) => {
  try {
    const userId = req.user.id;
    const filePath = req.params[0];
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    await UserFileService.deleteFileOrFolder(userId, filePath);
    
    // Invalidate caches
    await Cache.invalidateByTags([SimpleCache.createTagUser(userId)]);
    
    // Broadcast file delete event
    if (req.app.locals.broadcastFileEvent) {
      req.app.locals.broadcastFileEvent(userId, {
        type: 'file:deleted',
        path: filePath,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('File delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v2/file/:path
 * Create a new file or folder
 */
router.post('/file/*', async (req, res) => {
  try {
    const userId = req.user.id;
    const filePath = req.params[0];
    const { isFolder } = req.body;
    
    if (!filePath) {
      return res.status(400).json({ error: 'File path required' });
    }
    
    if (isFolder) {
      await UserFileService.createFolder(userId, filePath);
    } else {
      await UserFileService.createFile(userId, filePath);
    }
    
    // Invalidate caches
    await Cache.invalidateByTags([SimpleCache.createTagUser(userId)]);
    
    // Broadcast file create event
    if (req.app.locals.broadcastFileEvent) {
      req.app.locals.broadcastFileEvent(userId, {
        type: 'file:created',
        path: filePath,
        isFolder: isFolder,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error('File create error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/v2/upload
 * Upload files (simplified)
 */
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const userId = req.user.id;
    const targetDir = req.body.dir || '';
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const uploaded = [];
    for (const file of req.files) {
      const filePath = targetDir ? `${targetDir}/${file.originalname}` : file.originalname;
      await UserFileService.writeBinaryFile(userId, filePath, file.buffer);
      uploaded.push({ path: filePath });
    }
    
    // Invalidate caches
    await Cache.invalidateByTags([SimpleCache.createTagUser(userId)]);
    
    res.json({ success: true, files: uploaded });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
