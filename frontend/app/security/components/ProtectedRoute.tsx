'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { getFreshAccessToken } from '@/lib/authToken';

interface ProtectedRouteProps {
  children: React.ReactNode
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;

    // Initial session check + proactive refresh if needed
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      // Try to ensure a fresh token before allowing entry
      if (session?.access_token) {
        try { await getFreshAccessToken(supabase); } catch {}
      }
      if (!isMounted) return;
      setSession(session);
      setLoading(false);
      if (!session) {
        router.replace('/security/login');
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
      if (!session) {
        router.replace('/security/login');
      }
    });

    return () => {
      isMounted = false;
      try { subscription.unsubscribe(); } catch {}
    };
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-cream">
        <div className="text-deep-espresso/80 text-sm">Loading…</div>
      </div>
    );
  }
  if (!session) return null;
  return <>{children}</>;
}
