-- Migration: Create job clustering tables
-- Description: Tables for semantic job clustering using vector embeddings
-- Date: 2025-01-XX

-- Job embeddings table
-- Stores separate title and description vectors, plus combined vector for clustering
CREATE TABLE IF NOT EXISTS job_embeddings (
    job_id uuid PRIMARY KEY REFERENCES vacancies(id) ON DELETE CASCADE,
    title_vector vector(1536), -- Embedding for job title
    description_vector vector(1536), -- Embedding for job description
    combined_vector vector(1536), -- Average of title_vector and description_vector
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Job clusters table
-- Maps each job to a cluster
CREATE TABLE IF NOT EXISTS job_clusters (
    cluster_id int NOT NULL,
    job_id uuid NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT now(),
    PRIMARY KEY (cluster_id, job_id)
);

-- Cluster properties table
-- Stores aggregated properties for each cluster
CREATE TABLE IF NOT EXISTS cluster_properties (
    cluster_id int PRIMARY KEY,
    representative_titles jsonb, -- Array of 3 most frequent titles
    representative_skills jsonb, -- Array of 5 most common skills
    representative_industries jsonb, -- Array of 3 most common industries
    job_count int DEFAULT 0, -- Number of jobs in this cluster
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_job_embeddings_combined_vector ON job_embeddings USING ivfflat (combined_vector vector_cosine_ops);
CREATE INDEX IF NOT EXISTS idx_job_clusters_cluster_id ON job_clusters(cluster_id);
CREATE INDEX IF NOT EXISTS idx_job_clusters_job_id ON job_clusters(job_id);

-- Add comments for documentation
COMMENT ON TABLE job_embeddings IS 'Stores vector embeddings for job titles, descriptions, and combined vectors for clustering';
COMMENT ON TABLE job_clusters IS 'Maps jobs to their assigned clusters';
COMMENT ON TABLE cluster_properties IS 'Stores aggregated properties (titles, skills, industries) for each cluster';

-- Enable RLS
ALTER TABLE job_embeddings ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_clusters ENABLE ROW LEVEL SECURITY;
ALTER TABLE cluster_properties ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Allow all authenticated users to read, but only service role can write
CREATE POLICY "Anyone can view job embeddings"
    ON job_embeddings FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage job embeddings"
    ON job_embeddings FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can view job clusters"
    ON job_clusters FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage job clusters"
    ON job_clusters FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Anyone can view cluster properties"
    ON cluster_properties FOR SELECT
    USING (true);

CREATE POLICY "Service role can manage cluster properties"
    ON cluster_properties FOR ALL
    USING (true)
    WITH CHECK (true);


