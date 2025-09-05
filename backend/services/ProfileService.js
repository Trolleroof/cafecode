export class ProfileService {
  static async incrementProjectCount(supabase, userId) {
    try {
      const { error: rpcError } = await supabase.rpc('increment_project_count', { user_uuid: userId });
      if (!rpcError) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('project_count')
          .eq('id', userId)
          .single();
        return { ok: true, count: profile?.project_count ?? null };
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
      const updates = {
        payment_status: 'paid',
        has_unlimited_access: true,
        updated_at: new Date().toISOString(),
      };
      const { error: updateErr } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId);
      if (updateErr) {
        return { ok: false, error: updateErr.message };
      }
      const { data: profile } = await supabase
        .from('profiles')
        .select('project_count, payment_status, has_unlimited_access')
        .eq('id', userId)
        .single();
      return { ok: true, profile };
    } catch (e) {
      return { ok: false, error: e?.message || 'unknown error' };
    }
  }
}

