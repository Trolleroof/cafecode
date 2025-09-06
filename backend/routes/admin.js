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

export default router;

