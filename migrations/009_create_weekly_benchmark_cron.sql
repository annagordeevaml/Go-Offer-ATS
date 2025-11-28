-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Create a function to run benchmarks for all benchmark_jobs
CREATE OR REPLACE FUNCTION run_weekly_benchmarks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    benchmark_record RECORD;
    job_uuid uuid;
    version_text text := 'v1'; -- Default version, can be parameterized
BEGIN
    -- Loop through all benchmark_jobs
    FOR benchmark_record IN
        SELECT job_id, id
        FROM benchmark_jobs
        WHERE created_at IS NOT NULL
    LOOP
        job_uuid := benchmark_record.job_id;
        
        -- Call the benchmark edge function via HTTP
        -- Note: This requires the Supabase Edge Function URL
        -- In production, you would use http_request or similar
        -- For now, we'll log the job_id that should be benchmarked
        RAISE NOTICE 'Benchmark should be run for job_id: %', job_uuid;
        
        -- In a real implementation, you would:
        -- 1. Use http_request extension to call the Edge Function
        -- 2. Or use a background job queue system
        -- 3. Or trigger a webhook
        
    END LOOP;
END;
$$;

-- Schedule weekly benchmark runs (every Monday at 2 AM UTC)
-- Note: pg_cron syntax may vary by Supabase version
-- This is a template - adjust based on your Supabase setup

-- Uncomment and adjust if pg_cron is available:
/*
SELECT cron.schedule(
    'weekly-benchmark-run',
    '0 2 * * 1', -- Every Monday at 2 AM UTC
    $$
    SELECT run_weekly_benchmarks();
    $$
);
*/

-- Alternative: Create a simpler version that can be called manually
-- or via Supabase Edge Function scheduler

-- Create a table to track scheduled benchmark runs
CREATE TABLE IF NOT EXISTS benchmark_schedule (
    id serial PRIMARY KEY,
    job_id uuid REFERENCES vacancies(id) ON DELETE CASCADE,
    version text DEFAULT 'v1',
    schedule_type text DEFAULT 'weekly', -- 'weekly', 'daily', 'manual'
    last_run timestamptz,
    next_run timestamptz,
    enabled boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Create index for efficient queries
CREATE INDEX IF NOT EXISTS idx_benchmark_schedule_next_run ON benchmark_schedule(next_run) WHERE enabled = true;

-- Function to get jobs that need benchmarking
CREATE OR REPLACE FUNCTION get_scheduled_benchmarks()
RETURNS TABLE (
    job_id uuid,
    version text,
    schedule_id int
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        bs.job_id,
        bs.version,
        bs.id
    FROM benchmark_schedule bs
    WHERE bs.enabled = true
        AND (bs.next_run IS NULL OR bs.next_run <= now())
    ORDER BY bs.next_run ASC NULLS LAST;
END;
$$;

-- Function to update next_run timestamp after benchmark completes
CREATE OR REPLACE FUNCTION update_benchmark_schedule(schedule_id int)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    UPDATE benchmark_schedule
    SET 
        last_run = now(),
        next_run = now() + INTERVAL '7 days' -- Weekly schedule
    WHERE id = schedule_id;
END;
$$;


