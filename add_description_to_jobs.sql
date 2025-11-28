-- Add description column to jobs table
-- This column stores the full job description text

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS description TEXT;

-- Add a comment to the column
COMMENT ON COLUMN public.jobs.description IS 'Full job description text';


