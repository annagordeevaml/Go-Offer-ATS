-- Add unified_titles field to candidates table for quick access
-- This is a JSONB array that stores unified titles for fast queries
-- The detailed relationship is still stored in candidate_unified_titles table

ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS unified_titles TEXT[] DEFAULT '{}';

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS idx_candidates_unified_titles ON public.candidates USING GIN(unified_titles);

-- Add comment
COMMENT ON COLUMN public.candidates.unified_titles IS 'Array of standardized unified job titles for quick access. Detailed relationship stored in candidate_unified_titles table.';


