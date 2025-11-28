-- Migration: Create title_mapping table
-- Description: Maps raw job titles to standardized general titles
-- Date: 2025-01-XX

CREATE TABLE IF NOT EXISTS title_mapping (
  raw_title text PRIMARY KEY,
  general_title text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_title_mapping_general_title ON title_mapping(general_title);

-- Add comment
COMMENT ON TABLE title_mapping IS 'Maps raw job titles to standardized general title categories';

-- Insert some common mappings (can be expanded)
INSERT INTO title_mapping (raw_title, general_title) VALUES
  ('ceo', 'CEO'),
  ('chief executive officer', 'CEO'),
  ('coo', 'COO'),
  ('chief operating officer', 'COO'),
  ('cto', 'CTO'),
  ('chief technology officer', 'CTO'),
  ('cpo', 'CPO'),
  ('chief product officer', 'CPO'),
  ('cmo', 'CMO'),
  ('chief marketing officer', 'CMO'),
  ('cfo', 'CFO'),
  ('chief financial officer', 'CFO'),
  ('chro', 'CHRO'),
  ('chief human resources officer', 'CHRO'),
  ('product manager', 'Product Manager'),
  ('program manager', 'Program Manager'),
  ('project manager', 'Project Manager'),
  ('software engineer', 'Software Engineer'),
  ('backend engineer', 'Backend Engineer'),
  ('frontend engineer', 'Frontend Engineer'),
  ('full-stack engineer', 'Full-Stack Engineer'),
  ('fullstack engineer', 'Full-Stack Engineer'),
  ('devops engineer', 'DevOps Engineer'),
  ('cloud engineer', 'Cloud Engineer'),
  ('cybersecurity engineer', 'Cybersecurity Engineer'),
  ('data engineer', 'Data Engineer'),
  ('machine learning engineer', 'Machine Learning Engineer'),
  ('ml engineer', 'Machine Learning Engineer'),
  ('ai engineer', 'AI Engineer'),
  ('analyst', 'Analyst'),
  ('bi developer', 'BI Developer'),
  ('data scientist', 'Data Scientist'),
  ('qa', 'QA'),
  ('quality assurance', 'QA'),
  ('tester', 'QA'),
  ('ux/ui designer', 'UX/UI Designer'),
  ('product designer', 'Product Designer'),
  ('graphic designer', 'Graphic Designer'),
  ('motion designer', 'Motion Designer'),
  ('marketing manager', 'Marketing Manager'),
  ('content manager', 'Content Manager'),
  ('social media manager', 'Social Media Manager'),
  ('sales manager', 'Sales Manager'),
  ('business development manager', 'Business Development Manager'),
  ('account manager', 'Account Manager'),
  ('customer success manager', 'Customer Success Manager'),
  ('customer support manager', 'Customer Support Manager'),
  ('operations manager', 'Operations Manager'),
  ('supply chain manager', 'Supply Chain Manager'),
  ('logistics manager', 'Logistics Manager'),
  ('strategy manager', 'Strategy Manager'),
  ('event manager', 'Event Manager'),
  ('finance manager', 'Finance Manager'),
  ('hr manager', 'HR Manager'),
  ('legal counsel', 'Legal Counsel'),
  ('recruiter', 'Recruiter'),
  ('office manager', 'Office Manager'),
  ('it support', 'IT Support'),
  ('data architect', 'Data Architect')
ON CONFLICT (raw_title) DO NOTHING;


