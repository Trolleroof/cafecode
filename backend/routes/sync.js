import express from 'express';
import { WebContainerSyncService } from '../services/WebContainerSyncService.js';

const router = express.Router();

// GET /api/sync/pull - list all files with metadata
router.get('/pull', async (req, res) => {
  try {
    const userId = req.user.id;
    const list = await WebContainerSyncService.listAll(userId);
    res.json({ files: list });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/sync/push - apply batch changes with naive conflict detection
router.post('/push', async (req, res) => {
  try {
    const userId = req.user.id;
    const { changes } = req.body || {};
    if (!Array.isArray(changes)) return res.status(400).json({ error: 'changes array required' });
    const result = await WebContainerSyncService.applyChanges(userId, changes);
    res.json({ result });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/sync/file/:path - fetch remote content + hash for conflict checks
router.get('/file/*', async (req, res) => {
  try {
    const userId = req.user.id;
    const filePath = req.params[0];
    const data = await WebContainerSyncService.getRemoteContent(userId, filePath);
    res.json(data);
  } catch (e) {
    res.status(404).json({ error: e.message });
  }
});

export default router;

