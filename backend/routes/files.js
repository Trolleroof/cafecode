import express from 'express';
import { UserFileService } from '../services/UserFileService.js';
import path from 'path';
import fs from 'fs';

const router = express.Router();

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

export default router; 