import express from 'express';
import { ProfileService } from '../services/ProfileService.js';

const router = express.Router();

// Increment user's project count
router.post('/incrementProjectCount', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const result = await ProfileService.incrementProjectCount(req.supabase, userId);
    if (!result.ok) {
      return res.status(500).json({ error: 'Failed to increment project count', details: result.error });
    }
    return res.json({ success: true, project_count: result.count });
  } catch (e) {
    console.error('account/incrementProjectCount error:', e);
    return res.status(500).json({ error: 'Failed to increment project count' });
  }
});

// Grant paid + unlimited access (dev utility)
router.post('/grantUnlimited', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_PAYMENT !== 'true') {
      return res.status(403).json({ error: 'Disabled in production' });
    }
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    const result = await ProfileService.grantUnlimitedAccess(req.supabase, userId);
    if (!result.ok) {
      return res.status(500).json({ error: 'Failed to update profile', details: result.error });
    }
    return res.json({ success: true, profile: result.profile });
  } catch (e) {
    console.error('account/grantUnlimited error:', e);
    return res.status(500).json({ error: 'Failed to grant unlimited access' });
  }
});

export default router;

