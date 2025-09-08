export class ProfileService {
  static async incrementProjectCount(supabase, userId) {
    try {
      const { error: rpcError } = await supabase.rpc('increment_project_count', { user_uuid: userId });
      if (!rpcError) {
        // Fetch the updated count reliably as a single row
        const { data: profile } = await supabase
          .from('profiles')
          .select('project_count')
          .eq('id', userId)
          .single();

        return {
          ok: true,
          count: profile?.project_count ?? null,
        };
      }
      // Fallback: select + update
      const { data: profile } = await supabase
        .from('profiles')
        .select('project_count')
        .eq('id', userId)
        .single();
      const next = (profile?.project_count || 0) + 1;
      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ project_count: next })
        .eq('id', userId);
      if (updateErr) {
        return { ok: false, error: updateErr.message };
      }
      return { ok: true, count: next };
    } catch (e) {
      return { ok: false, error: e?.message || 'unknown error' };
    }
  }

  static async grantUnlimitedAccess(supabase, userId) {
    try {
      // Prefer using the same DB function Stripe webhook uses to keep logic consistent
      const dummySession = `dev_dummy_${Date.now()}`;
      const { error: rpcError } = await supabase.rpc('grant_unlimited_access', {
        user_uuid: userId,
        stripe_session: dummySession,
        payment_status: 'paid',
        amount_cents: 0,
      });

      if (rpcError) {
        // Fallback to direct update if RPC is unavailable
        const updates = {
          payment_status: 'paid',
          has_unlimited_access: true,
          upgraded_at: new Date().toISOString(),
          stripe_session_id: dummySession,
          updated_at: new Date().toISOString(),
        };
        const { error: updateErr } = await supabase
          .from('profiles')
          .update(updates)
          .eq('id', userId);
        if (updateErr) {
          return { ok: false, error: updateErr.message };
        }
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('project_count, payment_status, has_unlimited_access, upgraded_at, stripe_session_id')
        .eq('id', userId)
        .single();
      return { ok: true, profile };
    } catch (e) {
      return { ok: false, error: e?.message || 'unknown error' };
    }
  }

  static async resetProfile(supabase, userId) {
    try {
      const updates = {
        project_count: 0,
        payment_status: 'unpaid',
        has_unlimited_access: false,
        stripe_session_id: null,
        upgraded_at: null,
        updated_at: new Date().toISOString(),
      };
      const { error: updateErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      if (updateErr) {
        return { ok: false, error: updateErr.message };
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('project_count, payment_status, has_unlimited_access, upgraded_at')
        .eq('id', userId)
        .single();
      if (error) return { ok: false, error: error.message };
      return { ok: true, profile };
    } catch (e) {
      return { ok: false, error: e?.message || 'unknown error' };
    }
  }
}
