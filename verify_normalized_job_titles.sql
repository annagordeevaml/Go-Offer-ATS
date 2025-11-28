-- Verify normalized job titles in candidates table
-- This query shows which candidates have normalized job titles and which don't

SELECT 
  id,
  name,
  job_title,
  normalized_job_title,
  CASE 
    WHEN job_title_embedding IS NOT NULL THEN 'Yes'
    ELSE 'No'
  END as has_embedding,
  created_at
FROM public.candidates
WHERE job_title IS NOT NULL 
  AND job_title != ''
ORDER BY 
  CASE 
    WHEN normalized_job_title IS NULL THEN 0
    ELSE 1
  END,
  created_at DESC
LIMIT 50;

-- Count summary
SELECT 
  COUNT(*) as total_candidates,
  COUNT(normalized_job_title) as with_normalized_title,
  COUNT(*) - COUNT(normalized_job_title) as without_normalized_title,
  COUNT(job_title_embedding) as with_embedding
FROM public.candidates
WHERE job_title IS NOT NULL 
  AND job_title != '';


