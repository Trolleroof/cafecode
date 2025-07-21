import express from 'express';
import { UserFileService } from '../services/UserFileService.js';

const router = express.Router();

// Read a file
router.get('/read', (req, res) => {
  try {
    const userId = req.user.id;
    const relPath = req.query.path;
    const data = UserFileService.readFile(userId, relPath);
    res.json({ data });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// Write a file
router.post('/write', (req, res) => {
  try {
    const userId = req.user.id;
    const { path: relPath, data } = req.body;
    UserFileService.writeFile(userId, relPath, data);
    res.json({ success: true });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// Delete a file
router.delete('/delete', (req, res) => {
  try {
    const userId = req.user.id;
    const relPath = req.body.path;
    UserFileService.deleteFile(userId, relPath);
    res.json({ success: true });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// Create a file or folder
router.post('/create', (req, res) => {
  try {
    const userId = req.user.id;
    const { path: relPath, isFolder } = req.body;
    if (isFolder) {
      UserFileService.createFolder(userId, relPath);
    } else {
      UserFileService.createFile(userId, relPath);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// Rename a file or folder
router.post('/rename', (req, res) => {
  try {
    const userId = req.user.id;
    const { oldPath, newPath } = req.body;
    UserFileService.renameFile(userId, oldPath, newPath);
    res.json({ success: true });
  } catch (err) {
    res.status(403).json({ error: err.message });
  }
});

// List files in a directory (recursive)
router.get('/list', (req, res) => {
  try {
    const userId = req.user.id;
    const relDir = req.query.dir || '.';
    const recursive = req.query.recursive === 'true';
    const files = UserFileService.listFiles(userId, relDir, recursive);
    res.json({ files });
  } catch (err) {
    res.status(403).json({ error: err.message + " AKA the /list route is not working" });
  }
});

export default router; 