import express from 'express';

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

    // Call the database function to grant unlimited access
    const { data, error } = await supabase.rpc('grant_unlimited_access');

    if (error) {
      console.error('Error granting unlimited access:', error);
      return res.status(500).json({ error: error.message });
    }

    if (!data || data.length === 0) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const profile = data[0];
    return res.json({ 
      success: true, 
      message: 'Unlimited access granted successfully!',
      profile: {
        id: profile.id,
        email: profile.email,
        username: profile.username,
        hasUnlimitedAccess: profile.has_unlimited_access,
        paymentStatus: profile.payment_status,
        stripeSessionId: profile.stripe_session_id,
        upgradedAt: profile.upgraded_at,
        projectCount: profile.project_count
      }
    });
  } catch (e) {
    console.error('Error in grant-unlimited-access:', e);
    return res.status(500).json({ error: e.message || 'Unknown error' });
  }
});

export default router;

