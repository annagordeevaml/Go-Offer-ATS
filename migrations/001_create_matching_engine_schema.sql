-- Step 1: Implement the database schema in Supabase/Postgres for the matching engine
-- Description: Enable pgvector extension and create candidates/vacancies tables for vector search

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Candidates table
CREATE TABLE candidates (
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
CREATE TABLE vacancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  location text,
  industry text,
  skills_required text[],
  job_text text,
  meta_embedding vector(1536),
  content_embedding vector(1536),
  created_at timestamptz DEFAULT now()
);
