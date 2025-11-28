-- Add additional fields to jobs table for LinkedIn-style job postings

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS workplace_type TEXT CHECK (workplace_type IN ('Remote', 'On-site', 'Hybrid'));

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS employment_type TEXT DEFAULT 'Full-time' CHECK (employment_type IN ('Full-time', 'Part-time', 'Contract', 'Temporary', 'Internship'));

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS seniority_level TEXT DEFAULT 'Not Applicable' CHECK (seniority_level IN ('Internship', 'Entry level', 'Associate', 'Mid-Senior level', 'Director', 'Executive', 'Not Applicable'));

-- Add comments
COMMENT ON COLUMN public.jobs.workplace_type IS 'Workplace type: Remote, On-site, or Hybrid';
COMMENT ON COLUMN public.jobs.employment_type IS 'Employment type: Full-time, Part-time, Contract, Temporary, or Internship';
COMMENT ON COLUMN public.jobs.seniority_level IS 'Seniority level: Internship, Entry level, Associate, Mid-Senior level, Director, Executive, or Not Applicable';

-- Set defaults for existing rows
UPDATE public.jobs
SET workplace_type = 'Remote'
WHERE workplace_type IS NULL;

UPDATE public.jobs
SET employment_type = 'Full-time'
WHERE employment_type IS NULL;

UPDATE public.jobs
SET seniority_level = 'Not Applicable'
WHERE seniority_level IS NULL;


