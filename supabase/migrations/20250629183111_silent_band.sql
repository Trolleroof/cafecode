/*
  # Fix RLS policy for profiles table

  1. Changes
    - Drop existing INSERT policy that uses incorrect uid() function
    - Create new INSERT policy using correct auth.uid() function
    
  2. Security
    - Ensure authenticated users can insert their own profile data
    - Policy checks that auth.uid() matches the profile id being inserted
*/

-- Drop the existing INSERT policy that has the incorrect function reference
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;

-- Create the correct INSERT policy using auth.uid()
CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);