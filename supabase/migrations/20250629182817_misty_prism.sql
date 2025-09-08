

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  username text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Payment and project tracking columns
  has_unlimited_access boolean DEFAULT false,
  payment_status text DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'paid', 'pending', 'failed')),
  stripe_session_id text,
  upgraded_at timestamptz,
  project_count integer DEFAULT 0
);



-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid duplicates when re-running
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create policies
CREATE POLICY "Users can view own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN

  INSERT INTO public.profiles (id, email, username)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1))
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Create function to handle profile updates
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS handle_profiles_updated_at ON profiles;
CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- Create function to grant unlimited access
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
  UPDATE public.profiles
  SET
    has_unlimited_access = true,
    payment_status = 'paid',
    stripe_session_id = COALESCE(stripe_session_id, 'MANUAL_GRANT_' || to_char(now(), 'YYYYMMDDHH24MISS')),
    upgraded_at = COALESCE(upgraded_at, now()),
    updated_at = now()
  WHERE id = auth.uid();
  
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
  FROM public.profiles p
  WHERE p.id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
