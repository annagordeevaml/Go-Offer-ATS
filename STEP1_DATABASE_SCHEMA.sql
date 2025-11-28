-- Step 1: Implement the database schema in Supabase/Postgres for the matching engine
-- This migration creates the candidates and vacancies tables with vector embeddings

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name text,
  general_title text,
  location text,
  industry text,
  skills text[],
  resume_text text,
  meta_embedding vector(1536),
  content_embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

-- Vacancies table
CREATE TABLE IF NOT EXISTS vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  general_title text,
  location text,
  industry text,
  skills_required text[],
  job_text text,
  meta_embedding vector(1536),
  content_embedding vector(1536),
  created_at timestamptz DEFAULT now()
);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_candidates_meta_embedding ON candidates USING ivfflat (meta_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_candidates_content_embedding ON candidates USING ivfflat (content_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_vacancies_meta_embedding ON vacancies USING ivfflat (meta_embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_vacancies_content_embedding ON vacancies USING ivfflat (content_embedding vector_cosine_ops);

-- Add comments for documentation
COMMENT ON TABLE candidates IS 'Stores candidate profiles with vector embeddings for matching';
COMMENT ON TABLE vacancies IS 'Stores job vacancies with vector embeddings for matching';
COMMENT ON COLUMN candidates.meta_embedding IS 'Embedding vector for candidate metadata (name, title, location, industry, skills)';
COMMENT ON COLUMN candidates.content_embedding IS 'Embedding vector for candidate resume content';
COMMENT ON COLUMN vacancies.meta_embedding IS 'Embedding vector for vacancy metadata (title, location, industry, skills)';
COMMENT ON COLUMN vacancies.content_embedding IS 'Embedding vector for vacancy job description content';


