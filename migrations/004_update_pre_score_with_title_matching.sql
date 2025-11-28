-- Migration: Update pre-score function to include title matching bonuses
-- Description: Adds title matching logic to pre-score calculation
-- Date: 2025-01-XX

CREATE OR REPLACE FUNCTION match_candidates_pre_score(vacancy_uuid uuid)
RETURNS TABLE (
    candidate_id uuid,
    meta_similarity float,
    content_similarity float,
    pre_score float,
    title_bonus float
)
AS $$
DECLARE
    vacancy_general_title text;
BEGIN
  -- Get vacancy general_title
  SELECT general_title INTO vacancy_general_title
  FROM vacancies
  WHERE id = vacancy_uuid;

  RETURN QUERY
  SELECT
    c.id,
    (1 - (v.meta_embedding <=> c.meta_embedding)) AS meta_similarity,
    (1 - (v.content_embedding <=> c.content_embedding)) AS content_similarity,
    (
      0.35 * (1 - (v.meta_embedding <=> c.meta_embedding)) +
      0.65 * (1 - (v.content_embedding <=> c.content_embedding))
    ) AS pre_score,
    CASE
      -- Exact title match: +0.4
      WHEN LOWER(COALESCE(c.general_title, '')) = LOWER(COALESCE(vacancy_general_title, '')) 
        AND c.general_title IS NOT NULL 
        AND vacancy_general_title IS NOT NULL
        THEN 0.4
      -- Related title match: +0.2 (handled in application layer)
      ELSE 0.0
    END AS title_bonus
  FROM candidates c, vacancies v
  WHERE v.id = vacancy_uuid
  ORDER BY pre_score DESC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Update comment
COMMENT ON FUNCTION match_candidates_pre_score(uuid) IS 'Computes pre-score similarity between a vacancy and all candidates. Returns top 50 candidates by pre_score. Includes title matching bonus: +0.4 for exact match, +0.2 for related titles (handled in app layer).';


