-- Update admin user function to grant admin rights to anna@go-offer.us
-- This script updates the is_admin_user() function to allow anna@go-offer.us to have admin access
-- Run this script in Supabase SQL Editor

-- Update the is_admin_user() function to check for anna@go-offer.us
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
DECLARE
  user_email TEXT;
BEGIN
  -- Get the current user's email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = auth.uid();
  
  -- Check if the user is an admin
  -- Allow both admin@go-offer.us and anna@go-offer.us
  RETURN user_email = 'admin@go-offer.us' OR user_email = 'anna@go-offer.us';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verify the function was updated
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'is_admin_user';

-- Test the function (this will show NULL if not logged in, or true/false if logged in)
-- SELECT public.is_admin_user() as is_admin;

COMMENT ON FUNCTION public.is_admin_user() IS 'Checks if the current user is an admin. Returns true for admin@go-offer.us and anna@go-offer.us';


