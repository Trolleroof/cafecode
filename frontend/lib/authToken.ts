// Lightweight helpers to ensure we use a fresh access token for WS
// Works without extra deps by decoding the JWT payload client-side

import type { SupabaseClient, Session } from '@supabase/supabase-js'

function base64UrlDecode(input: string): string {
  // Replace URL-safe chars and add padding
  let b64 = input.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4;
  if (pad) b64 += '='.repeat(4 - pad);
  try {
    return typeof atob !== 'undefined' ? atob(b64) : Buffer.from(b64, 'base64').toString('utf-8');
  } catch {
    return '';
  }
}

export function decodeJwtPayload(token: string): Record<string, any> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpiring(token: string, skewSeconds = 60): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return false;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= (now + skewSeconds);
}

export async function getFreshAccessToken(supabase: SupabaseClient): Promise<string | null> {
  // Get current session
  const { data: { session } } = await supabase.auth.getSession();
  const current = session as Session | null;
  const token = current?.access_token || null;
  if (!token) return null;

  // If token is fresh enough, use it
  if (!isTokenExpiring(token, 60)) return token;

  // Otherwise, attempt to refresh using stored refresh token
  const { data, error } = await supabase.auth.refreshSession();
  if (error) {
    console.warn('[AUTH] Failed to refresh session:', error.message);
    return token; // Fall back to old token; server will reject if fully expired
  }
  return data.session?.access_token || token;
}

