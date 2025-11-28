-- Create benchmark_jobs table for storing ground truth data
CREATE TABLE IF NOT EXISTS benchmark_jobs (
    id serial PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
    ground_truth_candidates jsonb NOT NULL, -- Array of candidate IDs that are manually labeled as relevant
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create matching_benchmark_results table for storing benchmark metrics
CREATE TABLE IF NOT EXISTS matching_benchmark_results (
    id serial PRIMARY KEY,
    job_id uuid NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
    version text NOT NULL, -- Scoring version identifier (e.g., 'v1', 'v2')
    precision_5 float,
    precision_10 float,
    recall_5 float,
    recall_10 float,
    ndcg_5 float,
    ndcg_10 float,
    mrr float,
    timestamp timestamptz DEFAULT now(),
    total_relevant_candidates int, -- Total number of relevant candidates in ground truth
    total_retrieved_candidates int, -- Total number of candidates retrieved by system
    metadata jsonb -- Additional metadata about the benchmark run
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_benchmark_jobs_job_id ON benchmark_jobs(job_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_job_id ON matching_benchmark_results(job_id);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_version ON matching_benchmark_results(version);
CREATE INDEX IF NOT EXISTS idx_benchmark_results_timestamp ON matching_benchmark_results(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE benchmark_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE matching_benchmark_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for benchmark_jobs
CREATE POLICY "Users can view their own benchmark jobs"
    ON benchmark_jobs FOR SELECT
    USING (auth.uid() = created_by_user_id OR auth.uid() IN (
        SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    ));

CREATE POLICY "Users can create benchmark jobs"
    ON benchmark_jobs FOR INSERT
    WITH CHECK (auth.uid() = created_by_user_id);

CREATE POLICY "Users can update their own benchmark jobs"
    ON benchmark_jobs FOR UPDATE
    USING (auth.uid() = created_by_user_id OR auth.uid() IN (
        SELECT id FROM auth.users WHERE raw_user_meta_data->>'role' = 'admin'
    ));

-- RLS Policies for matching_benchmark_results
CREATE POLICY "Users can view benchmark results"
    ON matching_benchmark_results FOR SELECT
    USING (true); -- All authenticated users can view benchmark results

CREATE POLICY "Service role can insert benchmark results"
    ON matching_benchmark_results FOR INSERT
    WITH CHECK (true); -- Edge functions use service role

CREATE POLICY "Service role can update benchmark results"
    ON matching_benchmark_results FOR UPDATE
    USING (true); -- Edge functions use service role


