-- Create vacancies table for matching engine
-- This table stores job postings that will be used for candidate matching
-- IMPORTANT: Run this script in Supabase SQL Editor

-- Enable pgvector extension if not already enabled
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop table if exists (for clean setup - remove this line if you want to keep existing data)
-- DROP TABLE IF EXISTS vacancies CASCADE;

-- Create vacancies table
CREATE TABLE IF NOT EXISTS vacancies (
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

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_vacancies_title ON vacancies(title);
CREATE INDEX IF NOT EXISTS idx_vacancies_location ON vacancies(location);
CREATE INDEX IF NOT EXISTS idx_vacancies_created_at ON vacancies(created_at);

-- Add comments for documentation
COMMENT ON TABLE vacancies IS 'Job postings used for candidate matching via vector similarity';
COMMENT ON COLUMN vacancies.meta_embedding IS 'Vector embedding of metadata (title, location, industry, skills)';
COMMENT ON COLUMN vacancies.content_embedding IS 'Vector embedding of full job description text';

-- Enable Row Level Security (RLS)
ALTER TABLE vacancies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Anyone can view vacancies" ON vacancies;
DROP POLICY IF EXISTS "Anyone can insert vacancies" ON vacancies;
DROP POLICY IF EXISTS "Anyone can update vacancies" ON vacancies;
DROP POLICY IF EXISTS "Anyone can delete vacancies" ON vacancies;

-- Create policy to allow all authenticated users to read vacancies
CREATE POLICY "Anyone can view vacancies" ON vacancies
  FOR SELECT
  USING (true);

-- Create policy to allow all authenticated users to insert vacancies
CREATE POLICY "Anyone can insert vacancies" ON vacancies
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow all authenticated users to update vacancies
CREATE POLICY "Anyone can update vacancies" ON vacancies
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Create policy to allow all authenticated users to delete vacancies
CREATE POLICY "Anyone can delete vacancies" ON vacancies
  FOR DELETE
  USING (true);

