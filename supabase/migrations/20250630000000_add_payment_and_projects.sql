update profiles
set
  has_unlimited_access = true,
  payment_status = 'paid',
  stripe_session_id = COALESCE(
    stripe_session_id,
    'MANUAL_GRANT_' || EXTRACT(
      EPOCH
      from
        now()
    )::text
  ),
  upgraded_at = now(),
  updated_at = now()
where
  id = auth.uid ()
returning
  *;