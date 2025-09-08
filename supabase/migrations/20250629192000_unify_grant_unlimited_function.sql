-- Introduce a parameterized helper so both client and webhook share logic

CREATE OR REPLACE FUNCTION public.grant_unlimited_access_by_id(
  target_user uuid,
  stripe_session text DEFAULT NULL,
  amount_cents integer DEFAULT NULL
)
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
  -- Update the specified user's profile to grant unlimited access
  UPDATE public.profiles AS p
  SET
    has_unlimited_access = true,
    payment_status = 'paid',
    stripe_session_id = COALESCE(p.stripe_session_id, stripe_session, 'MANUAL_GRANT_' || to_char(now(), 'YYYYMMDDHH24MISS')),
    upgraded_at = COALESCE(p.upgraded_at, now()),
    updated_at = now()
  WHERE p.id = target_user;

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
  WHERE p.id = target_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.grant_unlimited_access_by_id(uuid, text, integer) TO service_role;

-- Recreate the no-arg function to delegate to the helper using auth.uid()
CREATE OR REPLACE FUNCTION public.grant_unlimited_access()
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
  RETURN QUERY
  SELECT * FROM public.grant_unlimited_access_by_id(auth.uid(), NULL, NULL);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.grant_unlimited_access() TO authenticated;

