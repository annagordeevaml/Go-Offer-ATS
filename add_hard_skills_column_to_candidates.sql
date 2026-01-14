-- Add hard_skills column to candidates table
-- This column stores all hard and business skills extracted from candidate resumes with their analogues

-- Check if column exists, if not add it
DO $$
BEGIN
  -- Check if hard_skills column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'candidates' 
    AND column_name = 'hard_skills'
  ) THEN
    -- Add hard_skills column as TEXT array
    ALTER TABLE public.candidates 
    ADD COLUMN hard_skills TEXT[] DEFAULT '{}';
    
    -- Add comment
    COMMENT ON COLUMN public.candidates.hard_skills IS 'Array of hard skills, business skills, tools, platforms, technologies, systems, and their relevant analogues extracted from resume';
    
    -- Create GIN index for efficient array queries
    CREATE INDEX IF NOT EXISTS idx_candidates_hard_skills ON public.candidates USING GIN(hard_skills);
    
    RAISE NOTICE 'Column hard_skills added to candidates table';
  ELSE
    RAISE NOTICE 'Column hard_skills already exists in candidates table';
  END IF;
END $$;


