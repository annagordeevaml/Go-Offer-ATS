-- Add unified_titles column to candidates table
-- This column stores an array of unified job titles for each candidate

ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS unified_titles TEXT[] DEFAULT '{}';

-- Add a comment to the column
COMMENT ON COLUMN public.candidates.unified_titles IS 'Array of standardized unified job titles for the candidate';

-- Update existing candidates to have empty array if null
UPDATE public.candidates
SET unified_titles = '{}'
WHERE unified_titles IS NULL;


