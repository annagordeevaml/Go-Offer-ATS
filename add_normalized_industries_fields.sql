-- Add normalized industries and embedding fields to candidates table

-- Add normalized_industries column (array of normalized industry strings)
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS normalized_industries TEXT[];

-- Add industries_embedding column (vector type for pgvector)
-- text-embedding-3-large produces 3072-dimensional vectors
ALTER TABLE public.candidates 
ADD COLUMN IF NOT EXISTS industries_embedding vector(3072);

-- Create GIN index on normalized_industries array for faster searches
CREATE INDEX IF NOT EXISTS idx_candidates_normalized_industries 
ON public.candidates USING GIN(normalized_industries);

-- Note: ivfflat index cannot be created for vectors with more than 2000 dimensions
-- text-embedding-3-large produces 3072-dimensional vectors, so we skip the index
-- Vector similarity searches will still work, but may be slower without an index
-- For better performance with large vectors, consider using HNSW index (if available in your pgvector version)

COMMENT ON COLUMN public.candidates.normalized_industries IS 'Array of normalized and standardized industries in English lowercase';
COMMENT ON COLUMN public.candidates.industries_embedding IS 'Vector embedding of all normalized industries combined using text-embedding-3-large';


