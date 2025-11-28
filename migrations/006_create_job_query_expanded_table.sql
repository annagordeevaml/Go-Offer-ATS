-- Migration: Create job_query_expanded table
-- Description: Stores LLM-expanded job queries for enhanced semantic search
-- Date: 2025-01-XX

CREATE TABLE IF NOT EXISTS job_query_expanded (
  job_id uuid PRIMARY KEY REFERENCES vacancies(id) ON DELETE CASCADE,
  primary_title text,
  alternate_titles text[],
  core_responsibilities text[],
  skill_groups text[],
  industry text,
  expanded_keywords text[],
  job_vector_enhanced vector(1536),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Add index for vector search
CREATE INDEX IF NOT EXISTS idx_job_query_expanded_vector ON job_query_expanded USING ivfflat (job_vector_enhanced vector_cosine_ops);

-- Add comment
COMMENT ON TABLE job_query_expanded IS 'Stores LLM-expanded job queries with enhanced semantic vectors for improved candidate matching';


