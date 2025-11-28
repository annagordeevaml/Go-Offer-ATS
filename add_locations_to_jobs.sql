-- Add locations column to jobs table
-- This column stores an array of standardized locations (e.g., ["San Francisco, CA", "New York, NY"])

ALTER TABLE public.jobs
ADD COLUMN IF NOT EXISTS locations TEXT[] DEFAULT '{}';

-- Add a comment to the column
COMMENT ON COLUMN public.jobs.locations IS 'Array of standardized locations in LinkedIn format (e.g., "City, State" or "City, Country")';

-- Migrate existing location data to locations array
UPDATE public.jobs
SET locations = ARRAY[location]
WHERE location IS NOT NULL AND location != '' AND (locations IS NULL OR array_length(locations, 1) IS NULL);


