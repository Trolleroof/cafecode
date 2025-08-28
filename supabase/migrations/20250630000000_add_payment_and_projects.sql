/*
  # Add payment tracking and project counting tables

  1. New Tables
    - `user_profiles` (extends existing profiles with payment info)
    - `user_projects` (tracks user project creation)
    - `payment_history` (tracks Stripe payment history)

  2. Security
    - Enable RLS on new tables
    - Add policies for users to access their own data
    - Add policies for payment verification

  3. Functions
    - Add function to increment project count
    - Add function to check project limits
*/

-- Extend profiles table with payment information
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_unlimited_access boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS stripe_session_id text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS upgraded_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS project_count integer DEFAULT 0;

-- Create user_projects table to track individual projects
CREATE TABLE IF NOT EXISTS user_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  project_name text NOT NULL,
  project_type text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create payment_history table to track Stripe payments
CREATE TABLE IF NOT EXISTS payment_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_session_id text NOT NULL,
  amount integer NOT NULL, -- Amount in cents
  currency text DEFAULT 'usd',
  status text NOT NULL, -- 'pending', 'paid', 'failed'
  payment_intent_id text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_projects_user_id ON user_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_user_projects_created_at ON user_projects(created_at);
CREATE INDEX IF NOT EXISTS idx_payment_history_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_history_stripe_session_id ON payment_history(stripe_session_id);

-- Enable RLS on new tables
ALTER TABLE user_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for user_projects
CREATE POLICY "Users can view own projects"
  ON user_projects
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own projects"
  ON user_projects
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON user_projects
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON user_projects
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create RLS policies for payment_history
CREATE POLICY "Users can view own payment history"
  ON payment_history
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own payment history"
  ON payment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Create function to increment project count
CREATE OR REPLACE FUNCTION increment_project_count(user_uuid uuid)
RETURNS void AS $$
BEGIN
  UPDATE profiles 
  SET project_count = project_count + 1,
      updated_at = now()
  WHERE id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user can create more projects
CREATE OR REPLACE FUNCTION can_create_project(user_uuid uuid)
RETURNS boolean AS $$
DECLARE
  user_profile profiles%ROWTYPE;
BEGIN
  SELECT * INTO user_profile FROM profiles WHERE id = user_uuid;
  
  -- If user has unlimited access, they can always create projects
  IF user_profile.has_unlimited_access THEN
    RETURN true;
  END IF;
  
  -- Otherwise, check if they're under the 3-project limit
  RETURN user_profile.project_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to handle project creation with limit checking
CREATE OR REPLACE FUNCTION create_project_with_limit(
  user_uuid uuid,
  project_name text,
  project_type text DEFAULT 'general'
)
RETURNS uuid AS $$
DECLARE
  project_id uuid;
BEGIN
  -- Check if user can create more projects
  IF NOT can_create_project(user_uuid) THEN
    RAISE EXCEPTION 'Project limit reached. Upgrade to create unlimited projects.';
  END IF;
  
  -- Create the project
  INSERT INTO user_projects (user_id, project_name, project_type)
  VALUES (user_uuid, project_name, project_type)
  RETURNING id INTO project_id;
  
  -- Increment the project count
  PERFORM increment_project_count(user_uuid);
  
  RETURN project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to update payment status after Stripe webhook
CREATE OR REPLACE FUNCTION update_payment_status(
  user_uuid uuid,
  stripe_session text,
  payment_status text,
  amount_cents integer DEFAULT 1999
)
RETURNS void AS $$
BEGIN
  -- Update user profile
  UPDATE profiles 
  SET has_unlimited_access = (payment_status = 'paid'),
      payment_status = payment_status,
      stripe_session_id = stripe_session,
      upgraded_at = CASE WHEN payment_status = 'paid' THEN now() ELSE upgraded_at END,
      updated_at = now()
  WHERE id = user_uuid;
  
  -- Record in payment history
  INSERT INTO payment_history (user_id, stripe_session_id, amount, status)
  VALUES (user_uuid, stripe_session, amount_cents, payment_status);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for updated_at on user_projects
CREATE OR REPLACE FUNCTION handle_user_projects_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_user_projects_updated_at ON user_projects;
CREATE TRIGGER handle_user_projects_updated_at
  BEFORE UPDATE ON user_projects
  FOR EACH ROW EXECUTE FUNCTION handle_user_projects_updated_at();

-- Create trigger for updated_at on payment_history
CREATE OR REPLACE FUNCTION handle_payment_history_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_payment_history_updated_at ON payment_history;
CREATE TRIGGER handle_payment_history_updated_at
  BEFORE UPDATE ON payment_history
  FOR EACH ROW EXECUTE FUNCTION handle_payment_history_updated_at();
