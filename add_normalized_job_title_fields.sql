-- Add normalized job title and embedding fields to candidates table

-- Add normalized_job_title column
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS normalized_job_title TEXT;

-- Add job_title_embedding column (vector type for pgvector)
-- text-embedding-3-large produces 3072-dimensional vectors
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS job_title_embedding vector(3072);

-- Create index on normalized_job_title for faster searches
CREATE INDEX IF NOT EXISTS idx_candidates_normalized_job_title 
ON public.candidates(normalized_job_title);

-- Note: ivfflat index cannot be created for vectors with more than 2000 dimensions
-- text-embedding-3-large produces 3072-dimensional vectors, so we skip the index
-- Vector similarity searches will still work, but may be slower without an index
-- For better performance with large vectors, consider using HNSW index (if available in your pgvector version)
-- or use the normalized_job_title text field for exact/pattern matching instead

COMMENT ON COLUMN public.candidates.normalized_job_title IS 'Standardized and normalized job title in English';
COMMENT ON COLUMN public.candidates.job_title_embedding IS 'Vector embedding of the normalized job title using text-embedding-3-large';

