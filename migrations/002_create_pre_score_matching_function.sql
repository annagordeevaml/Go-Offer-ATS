-- Step 3: Implement the pre-score matching function
-- Description: SQL function to compute pre-score similarity between vacancies and candidates using pgvector

CREATE OR REPLACE FUNCTION match_candidates_pre_score(vacancy_uuid uuid)
RETURNS TABLE (
    candidate_id uuid,
    meta_similarity float,
    content_similarity float,
    pre_score float
)
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    (1 - (v.meta_embedding <=> c.meta_embedding)) AS meta_similarity,
    (1 - (v.content_embedding <=> c.content_embedding)) AS content_similarity,
    (
      0.35 * (1 - (v.meta_embedding <=> c.meta_embedding)) +
      0.65 * (1 - (v.content_embedding <=> c.content_embedding))
    ) AS pre_score
  FROM candidates c, vacancies v
  WHERE v.id = vacancy_uuid
  ORDER BY pre_score DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON FUNCTION match_candidates_pre_score(uuid) IS 'Computes pre-score similarity between a vacancy and all candidates. Returns top 50 candidates by pre_score. Pre-score = 0.35 * meta_similarity + 0.65 * content_similarity';
