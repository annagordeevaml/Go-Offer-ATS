-- Step 12: Create match_cache table for caching matching scores and explanations
-- Description: Cache neural_rank_score, llm_score, and explanations to reduce OpenAI costs

CREATE TABLE IF NOT EXISTS match_cache (
  vacancy_id uuid NOT NULL,
  candidate_id uuid NOT NULL,
  pre_score float,
  neural_rank_score float,
  llm_score float,
  final_score float,
  explanation text,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (vacancy_id, candidate_id)
);

-- Add indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_match_cache_vacancy_id ON match_cache(vacancy_id);
CREATE INDEX IF NOT EXISTS idx_match_cache_candidate_id ON match_cache(candidate_id);
CREATE INDEX IF NOT EXISTS idx_match_cache_updated_at ON match_cache(updated_at);

-- Add comments for documentation
COMMENT ON TABLE match_cache IS 'Caches matching scores and explanations to reduce OpenAI API costs';
COMMENT ON COLUMN match_cache.neural_rank_score IS 'Cached neural rank score (valid for 7 days)';
COMMENT ON COLUMN match_cache.llm_score IS 'Cached LLM post-rank score (valid for 7 days)';
COMMENT ON COLUMN match_cache.explanation IS 'Cached explanation text (valid for 30 days)';
COMMENT ON COLUMN match_cache.updated_at IS 'Timestamp when this cache entry was last updated';


