-- Add salary_unit column to candidates table
-- This column stores the unit of measurement for salary: 'year', 'month', or 'hour'

ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS salary_unit TEXT DEFAULT 'year' CHECK (salary_unit IN ('year', 'month', 'hour'));

-- Update existing records to have 'year' as default if they have salary data
UPDATE public.candidates
SET salary_unit = 'year'
WHERE (salary_min IS NOT NULL OR salary_max IS NOT NULL) AND salary_unit IS NULL;

-- Add comment to the column
COMMENT ON COLUMN public.candidates.salary_unit IS 'Unit of measurement for salary: year (per year), month (per month), or hour (per hour). Default is year.';


