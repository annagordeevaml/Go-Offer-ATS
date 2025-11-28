-- Update jobs table RLS policies to allow admins to access all jobs
-- This ensures that admins (anna@go-offer.us) can view and modify all jobs
-- Run this script in Supabase SQL Editor

-- First, make sure is_admin_user() function exists and is updated (run update_admin_user.sql first)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can insert own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can update own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Users can delete own jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can view all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can update all jobs" ON public.jobs;
DROP POLICY IF EXISTS "Admins can delete all jobs" ON public.jobs;

-- Create policies: users can only see their own jobs, but admins can see all
CREATE POLICY "Users can view own jobs"
  ON public.jobs FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user());

-- Users can insert their own jobs, admins can insert any job
CREATE POLICY "Users can insert own jobs"
  ON public.jobs FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user());

-- Users can update their own jobs, admins can update any job
CREATE POLICY "Users can update own jobs"
  ON public.jobs FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user())
  WITH CHECK (auth.uid() = user_id OR public.is_admin_user());

-- Users can delete their own jobs, admins can delete any job
CREATE POLICY "Users can delete own jobs"
  ON public.jobs FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin_user());

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
WHERE tablename = 'jobs'
ORDER BY policyname;


