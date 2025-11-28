-- Add accepts_remote_candidates column to jobs table

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS accepts_remote_candidates BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_jobs_accepts_remote_candidates 
ON public.jobs(accepts_remote_candidates);

COMMENT ON COLUMN public.jobs.accepts_remote_candidates IS 'Whether the job accepts remote candidates';


