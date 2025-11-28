-- Create table for candidate unified titles (many-to-many relationship)
-- This table links candidates to their standardized unified job titles

CREATE TABLE IF NOT EXISTS public.candidate_unified_titles (
  id BIGSERIAL PRIMARY KEY,
  candidate_id BIGINT NOT NULL REFERENCES public.candidates(id) ON DELETE CASCADE,
  unified_title TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(candidate_id, unified_title)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_candidate_unified_titles_candidate_id ON public.candidate_unified_titles(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_unified_titles_unified_title ON public.candidate_unified_titles(unified_title);

-- Enable RLS
ALTER TABLE public.candidate_unified_titles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid errors on re-run)
DROP POLICY IF EXISTS "Anyone can view unified titles" ON public.candidate_unified_titles;
DROP POLICY IF EXISTS "Allow all authenticated users to view unified titles" ON public.candidate_unified_titles;
DROP POLICY IF EXISTS "Only admin can manage unified titles" ON public.candidate_unified_titles;
DROP POLICY IF EXISTS "Allow admin to insert unified titles" ON public.candidate_unified_titles;
DROP POLICY IF EXISTS "Allow admin to update unified titles" ON public.candidate_unified_titles;
DROP POLICY IF EXISTS "Allow admin to delete unified titles" ON public.candidate_unified_titles;

-- RLS Policies
-- All authenticated users can view unified titles
CREATE POLICY "Anyone can view unified titles"
  ON public.candidate_unified_titles
  FOR SELECT
  TO authenticated
  USING (true);

-- Only admin users can insert/update/delete unified titles
CREATE POLICY "Only admin can manage unified titles"
  ON public.candidate_unified_titles
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Grant permissions
GRANT ALL ON public.candidate_unified_titles TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.candidate_unified_titles_id_seq TO authenticated;

-- Add comment
COMMENT ON TABLE public.candidate_unified_titles IS 'Stores the relationship between candidates and their standardized unified job titles';

