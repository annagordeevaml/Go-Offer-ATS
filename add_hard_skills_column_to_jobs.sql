-- Add hard_skills column to jobs table
-- This column stores all hard skills, soft skills, business skills, tools, platforms, technologies, systems, and their relevant analogues extracted from job descriptions

-- Check if column exists, if not add it
DO $$
BEGIN
  -- Check if hard_skills column exists
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'jobs' 
    AND column_name = 'hard_skills'
  ) THEN
    -- Add hard_skills column as TEXT array
    ALTER TABLE public.jobs 
    ADD COLUMN hard_skills TEXT[] DEFAULT '{}';
    
    -- Add comment
    COMMENT ON COLUMN public.jobs.hard_skills IS 'Array of hard skills, soft skills, business skills, tools, platforms, technologies, systems, and their relevant analogues extracted from job description';
    
    -- Create GIN index for efficient array queries
    CREATE INDEX IF NOT EXISTS idx_jobs_hard_skills ON public.jobs USING GIN(hard_skills);
    
    RAISE NOTICE 'Column hard_skills added to jobs table';
  ELSE
    RAISE NOTICE 'Column hard_skills already exists in jobs table';
  END IF;
END $$;


