-- Add normalized title and embedding fields to jobs table
-- This allows standardized job title matching and similarity search

-- Add normalized_title column
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS normalized_title TEXT;

-- Add title_embedding column (vector type for pgvector)
-- text-embedding-3-large produces 3072-dimensional vectors
ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS title_embedding vector(3072);

-- Create index on normalized_title for faster searches
CREATE INDEX IF NOT EXISTS idx_jobs_normalized_title 
ON public.jobs(normalized_title);

-- Note: ivfflat index cannot be created for vectors with more than 2000 dimensions
-- text-embedding-3-large produces 3072-dimensional vectors, so we skip the index
-- Vector similarity searches will still work, but may be slower without an index
-- For better performance with large vectors, consider using HNSW index (if available in your pgvector version)
-- or use the normalized_title text field for exact/pattern matching instead

COMMENT ON COLUMN public.jobs.normalized_title IS 'Standardized and normalized job title in English (lowercase)';
COMMENT ON COLUMN public.jobs.title_embedding IS 'Vector embedding of the normalized job title using text-embedding-3-large';


