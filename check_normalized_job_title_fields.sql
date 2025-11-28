-- Check if normalized_job_title and job_title_embedding columns exist in candidates table

-- Check for normalized_job_title column
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'candidates'
  AND column_name IN ('normalized_job_title', 'job_title_embedding');

-- If no rows are returned, the columns don't exist
-- Run add_normalized_job_title_fields.sql to create them


