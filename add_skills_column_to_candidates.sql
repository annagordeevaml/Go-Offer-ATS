-- Add skills column to candidates table if it doesn't exist
-- This column stores all hard and business skills extracted from candidate resumes

-- Check if column exists, if not add it
DO $$
BEGIN
  -- Check if skills column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'candidates' 
    AND column_name = 'skills'
  ) THEN
    -- Add skills column as TEXT array
    ALTER TABLE public.candidates 
    ADD COLUMN skills TEXT[] DEFAULT '{}';
    
    -- Add comment
    COMMENT ON COLUMN public.candidates.skills IS 'Array of hard skills, business skills, tools, platforms, technologies, systems, and their relevant analogues extracted from resume';
    
    -- Create GIN index for efficient array queries
    CREATE INDEX IF NOT EXISTS idx_candidates_skills ON public.candidates USING GIN(skills);
    
    RAISE NOTICE 'Column skills added to candidates table';
  ELSE
    RAISE NOTICE 'Column skills already exists in candidates table';
  END IF;
END $$;


