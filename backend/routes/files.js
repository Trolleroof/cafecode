import express from 'express';
import { UserFileService } from '../services/UserFileService.js';
import path from 'path';
import fs from 'fs';
import mime from 'mime-types';
import multer from 'multer';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

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

    const result = await UserFileService.scanPath(userId, relPath, {
      recursive,
      includeContent,
      maxBytes,
      extensions,
      ignoreHidden,
    });

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
    
    const data = await UserFileService.readFileSynced(userId, relPath);
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
    res.json({ success: true });
  } catch (err) {
    console.error('File copy error:', err);
    res.status(500).json({ error: err.message });
  }
});

// List files in a directory (recursive or non-recursive)
router.get('/list', async (req, res) => {
  try {
    const userId = req.user.id;
    const relDir = req.query.dir || '.';
    const recursive = req.query.recursive === 'true';
    
    const files = await UserFileService.listFiles(userId, relDir, recursive);
    res.json({ files });
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

export default router; 