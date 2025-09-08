-- Fix ambiguous column reference in grant_unlimited_access()
-- and ensure authenticated role can execute the function

CREATE OR REPLACE FUNCTION grant_unlimited_access()
RETURNS TABLE(
  id uuid,
  email text,
  username text,
  has_unlimited_access boolean,
  payment_status text,
  stripe_session_id text,
  upgraded_at timestamptz,
  project_count integer
) AS $$
BEGIN
  -- Update the current user's profile to grant unlimited access
  UPDATE public.profiles AS p
  SET
    has_unlimited_access = true,
    payment_status = 'paid',
    stripe_session_id = COALESCE(p.stripe_session_id, 'MANUAL_GRANT_' || to_char(now(), 'YYYYMMDDHH24MISS')),
    upgraded_at = COALESCE(p.upgraded_at, now()),
    updated_at = now()
  WHERE p.id = auth.uid();

  -- Return the updated profile
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.username,
    p.has_unlimited_access,
    p.payment_status,
    p.stripe_session_id,
    p.upgraded_at,
    p.project_count
  FROM public.profiles AS p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.grant_unlimited_access() TO authenticated;

