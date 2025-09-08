import express from 'express';
import { ProfileService } from '../services/ProfileService.js';

const router = express.Router();

// POST /api/admin/reset-db
// Resets profile variables for the authenticated user
router.post('/reset-db', async (req, res) => {
  try {
    const supabase = req.supabase;
    const user = req.user;
    if (!supabase || !user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        project_count: 0,
        payment_status: 'unpaid',
        has_unlimited_access: false,
        stripe_session_id: null,
        upgraded_at: null,
      })
      .eq('id', user.id);

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ success: true });
  } catch (e) {
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
});

// POST /api/admin/grant-unlimited-access
// Grants unlimited access to the authenticated user
router.post('/grant-unlimited-access', async (req, res) => {
  try {
    const supabase = req.supabase;
    const user = req.user;
    if (!supabase || !user?.id) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Use the same service logic as /api/account/grantUnlimited for consistency
    const result = await ProfileService.grantUnlimitedAccess(supabase, user.id);
    if (!result.ok) {
      console.error('Error granting unlimited access:', result.error);
      return res.status(500).json({ error: result.error || 'Failed to grant unlimited access' });
    }

    const profile = result.profile;
    return res.json({
      success: true,
      message: 'Unlimited access granted successfully!',
      profile: {
        id: user.id,
        email: profile?.email || null,
        username: profile?.username || null,
        hasUnlimitedAccess: profile?.has_unlimited_access === true || profile?.payment_status === 'paid',
        paymentStatus: profile?.payment_status || 'paid',
        stripeSessionId: profile?.stripe_session_id || null,
        upgradedAt: profile?.upgraded_at || null,
        projectCount: profile?.project_count ?? null,
      },
    });
  } catch (e) {
    console.error('Error in grant-unlimited-access:', e);
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
});

export default router;
