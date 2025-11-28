-- Update vacancies table RLS policies to use admin check
-- This ensures that only admins can modify vacancies
-- Run this script in Supabase SQL Editor

-- First, make sure is_admin_user() function exists (it should be created by create_candidates_table.sql)
-- If not, run update_admin_user.sql first

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view vacancies" ON vacancies;
DROP POLICY IF EXISTS "Anyone can insert vacancies" ON vacancies;
DROP POLICY IF EXISTS "Anyone can update vacancies" ON vacancies;
DROP POLICY IF EXISTS "Anyone can delete vacancies" ON vacancies;
DROP POLICY IF EXISTS "Admin can insert vacancies" ON vacancies;
DROP POLICY IF EXISTS "Admin can update vacancies" ON vacancies;
DROP POLICY IF EXISTS "Admin can delete vacancies" ON vacancies;

-- Create new policies with admin check
-- All authenticated users can view vacancies
CREATE POLICY "Anyone can view vacancies" ON vacancies
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can insert vacancies
CREATE POLICY "Admin can insert vacancies" ON vacancies
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

-- Only admins can update vacancies
CREATE POLICY "Admin can update vacancies" ON vacancies
  FOR UPDATE
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Only admins can delete vacancies
CREATE POLICY "Admin can delete vacancies" ON vacancies
  FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

-- Verify policies were created
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'vacancies'
ORDER BY policyname;


