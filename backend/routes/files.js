import express from 'express';
import { UserFileService } from '../services/UserFileService.js';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import multer from 'multer';
import { Cache, SimpleCache } from '../services/Cache.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Cache helpers
const buildKey = (userId, op, paramsObj) => {
  return `${userId}:${op}:${JSON.stringify(paramsObj)}`;
};
const buildTags = (userId, op, relPath) => {
  const tags = [
    SimpleCache.createTagUser(userId),
    SimpleCache.createTagOp(op),
  ];
  if (relPath) tags.push(SimpleCache.createTagPath(relPath));
  return tags;
};

// Deep scan a path (file or directory) with optional content and filters
router.get('/scan', async (req, res) => {
  try {
    const userId = req.user.id;
    const relPath = req.query.path || '.';
    const recursive = req.query.recursive === 'true';
    const includeContent = req.query.includeContent === 'true';
    const maxBytes = req.query.maxBytes ? parseInt(req.query.maxBytes, 10) : 65536;
    const ignoreHidden = req.query.ignoreHidden !== 'false';
    const extensions = req.query.extensions
      ? String(req.query.extensions).split(',').map(s => s.trim().toLowerCase()).filter(Boolean)
      : [];

    // Log scan request to terminal
    process.stdout.write('\n🔍 [FILE SCAN] Starting scan operation:\n');
    process.stdout.write(`   User ID: ${userId}\n`);
    process.stdout.write(`   Path: ${relPath}\n`);
    process.stdout.write(`   Recursive: ${recursive}\n`);
    process.stdout.write(`   Include Content: ${includeContent}\n`);
    process.stdout.write(`   Max Bytes: ${maxBytes}\n`);
    process.stdout.write(`   Ignore Hidden: ${ignoreHidden}\n`);
    process.stdout.write(`   Extensions: ${extensions.join(', ') || 'none'}\n\n`);

    // Cache lookup / de-dupe
    const cacheKey = buildKey(userId, 'scan', { relPath, recursive, includeContent, maxBytes, extensions, ignoreHidden });
    const cached = await Cache.get(cacheKey);
    let result = cached;
    if (!result) {
      result = await Cache.dedupe(cacheKey, async () => {
        return UserFileService.scanPath(userId, relPath, {
          recursive,
          includeContent,
          maxBytes,
          extensions,
          ignoreHidden,
        });
      });
      await Cache.set(cacheKey, result, {
        ttlMs: includeContent ? 15_000 : 30_000,
        tags: buildTags(userId, 'scan', relPath),
      });
    }

    // Log scan results to terminal
    process.stdout.write('🔍 [FILE SCAN] Scan completed successfully:\n');
    if (result.exists) {
      if (result.isDirectory) {
        const fileCount = result.files?.filter(f => !f.isDirectory).length || 0;
        const folderCount = result.files?.filter(f => f.isDirectory).length || 0;
        process.stdout.write(`   📁 Directory: ${result.path}\n`);
        process.stdout.write(`   📄 Files found: ${fileCount}\n`);
        process.stdout.write(`   📁 Folders found: ${folderCount}\n`);
        if (result.files && result.files.length > 0) {
          process.stdout.write('   📋 Contents:\n');
          result.files.forEach(item => {
            const icon = item.isDirectory ? '📁' : '📄';
            const size = item.size ? ` (${item.size} bytes)` : '';
            process.stdout.write(`      ${icon} ${item.name}${size}\n`);
          });
        }
      } else {
        process.stdout.write(`   📄 File: ${result.path}\n`);
        process.stdout.write(`   📏 Size: ${result.size} bytes\n`);
        if (result.content) {
          process.stdout.write(`   📝 Content preview: ${result.content.substring(0, 100)}${result.content.length > 100 ? '...' : ''}\n`);
        }
      }
    } else {
      process.stdout.write(`   ❌ Path not found: ${result.path}\n`);
    }
    process.stdout.write('\n');

    res.json(result);
  } catch (err) {
    process.stdout.write(`\n❌ [FILE SCAN] Error: ${err.message}\n\n`);
    res.status(500).json({ error: err.message });
  }
});

// Read a file
router.get('/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const relPath = req.query.path;
    
    if (!relPath) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    // Cache small reads only (<=128KB)
    const cacheKey = buildKey(userId, 'read', { relPath });
    let data = await Cache.get(cacheKey);
    if (!data) {
      data = await UserFileService.readFileSynced(userId, relPath);
      if (typeof data === 'string' && Buffer.byteLength(data, 'utf8') <= 131072) {
        await Cache.set(cacheKey, data, { ttlMs: 20_000, tags: buildTags(userId, 'read', relPath) });
      }
    }
    res.json({ data });
  } catch (err) {
    console.error('File read error:', err);
    res.status(404).json({ error: err.message });
  }
});

// Write a file
router.post('/write', async (req, res) => {
  try {
    const userId = req.user.id;
    const { path: relPath, data } = req.body;
    
    if (!relPath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    
    await UserFileService.writeFileSynced(userId, relPath, data || '');
    // Invalidate cache entries related to this path
    await Cache.invalidateUserPath(userId, relPath);
    res.json({ success: true });
  } catch (err) {
    console.error('File write error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete a file or folder
router.delete('/delete', async (req, res) => {
  try {
    const userId = req.user.id;
    const relPath = req.body.path;
    
    if (!relPath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    
    await UserFileService.deleteFileOrFolder(userId, relPath);
    
    // Enhanced cache invalidation: specifically target directory listing caches
    const parentDir = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : '.';
    console.log(`🗑️ [DELETE] Invalidating cache for file: ${relPath} and parent dir: ${parentDir}`);
    
    // Use the new targeted method for directory listings
    await Cache.invalidateDirectoryListings(userId, parentDir);
    await Cache.invalidateUserPath(userId, relPath);
    
    res.json({ success: true });
  } catch (err) {
    console.error('File delete error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create a file or folder
router.post('/create', async (req, res) => {
  try {
    const userId = req.user.id;
    const { path: relPath, isFolder } = req.body;
    
    if (!relPath) {
      return res.status(400).json({ error: 'Path is required' });
    }
    
    if (isFolder) {
      await UserFileService.createFolder(userId, relPath);
    } else {
      await UserFileService.createFile(userId, relPath);
    }
    
    // Enhanced cache invalidation: specifically target directory listing caches
    const parentDir = relPath.includes('/') ? relPath.substring(0, relPath.lastIndexOf('/')) : '.';
    console.log(`➕ [CREATE] Invalidating cache for file: ${relPath} and parent dir: ${parentDir}`);
    
    // Use the new targeted method for directory listings
    await Cache.invalidateDirectoryListings(userId, parentDir);
    await Cache.invalidateUserPath(userId, relPath);
    
    res.json({ success: true });
  } catch (err) {
    console.error('File create error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Rename/move a file or folder
router.post('/rename', async (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPath, newPath } = req.body;
    
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: 'Both oldPath and newPath are required' });
    }
    
    await UserFileService.renameFile(userId, oldPath, newPath);
    await Cache.invalidateUserPath(userId, oldPath);
    await Cache.invalidateUserPath(userId, newPath);
    res.json({ success: true });
  } catch (err) {
    console.error('File rename error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Copy a file or folder
router.post('/copy', async (req, res) => {
  try {
    const userId = req.user.id;
    const { sourcePath, destinationPath } = req.body;
    
    if (!sourcePath || !destinationPath) {
      return res.status(400).json({ error: 'Both sourcePath and destinationPath are required' });
    }
    
    await UserFileService.copyFileOrFolder(userId, sourcePath, destinationPath);
    await Cache.invalidateUserPath(userId, sourcePath);
    await Cache.invalidateUserPath(userId, destinationPath);
    res.json({ success: true });
  } catch (err) {
    console.error('File copy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List files in a directory (recursive or non-recursive)
// DEPRECATED: Redirects to v2 API
router.get('/list', async (req, res) => {
  try {
    console.log('⚠️ [DEPRECATED] /api/files/list called, redirecting to v2 API');
    
    const userId = req.user.id;
    const relDir = req.query.dir || '.';
    const recursive = req.query.recursive === 'true';
    
    // Fetch from v2 API format
    const v2Url = `${req.protocol}://${req.get('host')}/api/v2/files?recursive=${recursive ? '1' : '0'}&withContent=0`;
    const response = await fetch(v2Url, {
      headers: {
        'Authorization': req.headers.authorization
      }
    });
    
    if (!response.ok) {
      throw new Error(`V2 API returned ${response.status}`);
    }
    
    const v2Data = await response.json();
    
    // Transform v2 format back to v1 format
    const files = v2Data.map(item => ({
      name: item.path,
      isDirectory: item.isDir
    }));
    
    // Filter by directory if specified
    const filteredFiles = relDir === '.' ? files : files.filter(f => f.name.startsWith(relDir + '/'));
    
    res.json({ files: filteredFiles });
  } catch (err) {
    console.error('File list error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get file/folder metadata
router.get('/metadata', async (req, res) => {
  try {
    const userId = req.user.id;
    const relPath = req.query.path;
    
    if (!relPath) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    const metadata = await UserFileService.getMetadata(userId, relPath);
    res.json({ metadata });
  } catch (err) {
    console.error('File metadata error:', err);
    res.status(404).json({ error: err.message });
  }
});

// Check if file/folder exists
router.get('/exists', async (req, res) => {
  try {
    const userId = req.user.id;
    const relPath = req.query.path;
    
    if (!relPath) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    
    const exists = await UserFileService.exists(userId, relPath);
    res.json({ exists });
  } catch (err) {
    console.error('File exists check error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload files (images and text only)
router.post('/upload', upload.array('files'), async (req, res) => {
  try {
    const userId = req.user.id;
    const targetDir = (req.body.dir || '').toString();

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const allowedMimePrefixes = ['image/', 'text/'];
    const allowedExtraMimes = new Set([
      'application/json',
      'application/javascript',
      'text/javascript',
      'text/css',
      'application/xml',
      'application/x-sh',
      'application/x-shellscript',
    ]);
    const disallowedMimes = new Set(['application/pdf']);

    const saved = [];
    for (const file of req.files) {
      const { originalname, mimetype, buffer } = file;
      if (disallowedMimes.has(mimetype)) {
        return res.status(400).json({ error: `Unsupported file type: ${originalname}` });
      }
      const isAllowed = allowedMimePrefixes.some(prefix => mimetype.startsWith(prefix)) || allowedExtraMimes.has(mimetype);
      if (!isAllowed) {
        return res.status(400).json({ error: `Unsupported file type: ${originalname}` });
      }

      const relPath = targetDir && targetDir !== '.' ? path.posix.join(targetDir, originalname) : originalname;
      await UserFileService.writeBinaryFile(userId, relPath, buffer);
      saved.push({ path: relPath });
    }

    // Invalidate uploaded paths (and parent directory)
    if (saved.length > 0) {
      for (const f of saved) {
        await Cache.invalidateUserPath(userId, f.path);
      }
      if (targetDir) await Cache.invalidateUserPath(userId, targetDir);
    }

    res.json({ success: true, files: saved });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Stream raw file contents (for image preview)
router.get('/raw', async (req, res) => {
  try {
    const userId = req.user.id;
    const relPath = req.query.path;
    if (!relPath) {
      return res.status(400).json({ error: 'Path parameter is required' });
    }
    const absPath = UserFileService.resolveUserPath(userId, relPath);
    if (!fs.existsSync(absPath)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const stat = fs.statSync(absPath);
    if (stat.isDirectory()) {
      return res.status(400).json({ error: 'Path is a directory' });
    }
    const contentType = mime.lookup(absPath) || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', stat.size);
    const stream = fs.createReadStream(absPath);
    stream.pipe(res);
  } catch (err) {
    console.error('Raw file stream error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Cache metrics (for observability)
router.get('/cache-stats', async (req, res) => {
  try {
    const stats = await Cache.getStats();
    console.log(`📊 [CACHE-STATS] Cache stats requested: ${stats.entries} entries, ${stats.metrics.hitRate.toFixed(2)} hit rate`);
    res.json(stats);
  } catch (err) {
    console.error('Cache stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Force clear all caches for a user (for debugging)
router.post('/cache-clear', async (req, res) => {
  try {
    const userId = req.user.id;
    const { path } = req.body;
    
    if (path) {
      // Clear specific path
      const cleared = await Cache.invalidateUserPath(userId, path);
      console.log(`🧹 [CACHE-CLEAR] Cleared ${cleared} cache entries for path: ${path}`);
      res.json({ success: true, cleared });
    } else {
      // Clear all user caches
      const userTag = SimpleCache.createTagUser(userId);
      await Cache.invalidateByTags([userTag]);
      console.log(`🧹 [CACHE-CLEAR] Cleared all cache entries for user: ${userId}`);
      res.json({ success: true, message: 'All user caches cleared' });
    }
  } catch (err) {
    console.error('Cache clear error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router; 