-- Update unified_titles for all existing candidates
-- This script:
-- 1. Collects unified titles from candidate_unified_titles table
-- 2. Adds related titles (e.g., CMO → Marketing Manager)
-- 3. Updates the unified_titles column in candidates table

-- First, ensure the unified_titles column exists
ALTER TABLE public.candidates
ADD COLUMN IF NOT EXISTS unified_titles TEXT[] DEFAULT '{}';

-- Create a function to add related titles for C-level positions
CREATE OR REPLACE FUNCTION add_related_unified_titles(titles TEXT[])
RETURNS TEXT[] AS $$
DECLARE
  result TEXT[];
  title TEXT;
  related_titles TEXT[];
BEGIN
  result := titles;
  
  -- CMO → Marketing Manager
  IF 'CMO' = ANY(titles) AND NOT ('Marketing Manager' = ANY(titles)) THEN
    result := array_append(result, 'Marketing Manager');
  END IF;
  
  -- CPO → Product Manager
  IF 'CPO' = ANY(titles) AND NOT ('Product Manager' = ANY(titles)) THEN
    result := array_append(result, 'Product Manager');
  END IF;
  
  -- CFO → Finance Manager
  IF 'CFO' = ANY(titles) AND NOT ('Finance Manager' = ANY(titles)) THEN
    result := array_append(result, 'Finance Manager');
  END IF;
  
  -- CHRO → HR Manager
  IF 'CHRO' = ANY(titles) AND NOT ('HR Manager' = ANY(titles)) THEN
    result := array_append(result, 'HR Manager');
  END IF;
  
  -- COO → Operations Manager
  IF 'COO' = ANY(titles) AND NOT ('Operations Manager' = ANY(titles)) THEN
    result := array_append(result, 'Operations Manager');
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Update all candidates with unified titles from the relationship table
-- and add related titles
UPDATE public.candidates c
SET unified_titles = add_related_unified_titles(
  COALESCE(
    (
      SELECT array_agg(DISTINCT unified_title ORDER BY unified_title)
      FROM public.candidate_unified_titles
      WHERE candidate_id = c.id
    ),
    ARRAY[]::TEXT[]
  )
)
WHERE EXISTS (
  SELECT 1
  FROM public.candidate_unified_titles cut
  WHERE cut.candidate_id = c.id
);

-- For candidates that don't have unified titles in the relationship table,
-- but have them in the resume_data JSONB, try to extract and update
-- (This is a fallback - main source should be candidate_unified_titles table)
UPDATE public.candidates c
SET unified_titles = add_related_unified_titles(
  COALESCE(
    (c.resume_data->>'unified_titles')::TEXT[],
    ARRAY[]::TEXT[]
  )
)
WHERE c.resume_data IS NOT NULL
  AND c.resume_data ? 'unified_titles'
  AND (c.unified_titles IS NULL OR array_length(c.unified_titles, 1) IS NULL);

-- Clean up: remove duplicates and sort
UPDATE public.candidates
SET unified_titles = (
  SELECT array_agg(DISTINCT title ORDER BY title)
  FROM unnest(unified_titles) AS title
)
WHERE unified_titles IS NOT NULL AND array_length(unified_titles, 1) > 0;

-- Display summary
SELECT 
  COUNT(*) as total_candidates,
  COUNT(CASE WHEN array_length(unified_titles, 1) > 0 THEN 1 END) as candidates_with_unified_titles,
  COUNT(CASE WHEN 'CMO' = ANY(unified_titles) THEN 1 END) as candidates_with_cmo,
  COUNT(CASE WHEN 'Marketing Manager' = ANY(unified_titles) THEN 1 END) as candidates_with_marketing_manager
FROM public.candidates;


