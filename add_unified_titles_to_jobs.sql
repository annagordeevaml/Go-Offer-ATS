-- Add unified_titles column to jobs table
-- This column stores an array of unified job titles for each job posting

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS unified_titles TEXT[] DEFAULT '{}';

-- Add a comment to the column
COMMENT ON COLUMN public.jobs.unified_titles IS 'Array of standardized unified job titles for the job posting';

-- Update existing jobs to have empty array if null
UPDATE public.jobs
SET unified_titles = '{}'
WHERE unified_titles IS NULL;


