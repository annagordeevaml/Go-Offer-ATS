-- Add normalized location and embedding fields to jobs table

-- Add normalized_location column
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS normalized_location TEXT;

-- Add location_embedding column (vector type for pgvector)
-- text-embedding-3-large produces 3072-dimensional vectors
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS location_embedding vector(3072);

-- Create index on normalized_location for faster searches
CREATE INDEX IF NOT EXISTS idx_jobs_normalized_location 
ON public.jobs(normalized_location);

-- Note: ivfflat index cannot be created for vectors with more than 2000 dimensions
-- text-embedding-3-large produces 3072-dimensional vectors, so we skip the index

COMMENT ON COLUMN public.jobs.normalized_location IS 'Standardized and normalized location in English (lowercase)';
COMMENT ON COLUMN public.jobs.location_embedding IS 'Vector embedding of the normalized location using text-embedding-3-large';


