# Benchmark Setup Guide

This guide explains how to set up and use the Matching Performance Benchmark system.

## Overview

The benchmark system measures the accuracy and quality of the candidate-vacancy matching algorithm using industry-standard Information Retrieval (IR) metrics:

- **Precision@K**: Fraction of top K results that are relevant
- **Recall@K**: Fraction of relevant candidates found in top K  
- **nDCG@K**: Normalized Discounted Cumulative Gain (quality of ranking)
- **MRR**: Mean Reciprocal Rank (1 / rank of first relevant candidate)

## Database Setup

### Step 1: Run Migrations

Execute the SQL migrations in order:

```bash
# 1. Create benchmark tables
psql -f migrations/008_create_benchmark_tables.sql

# 2. Create weekly benchmark scheduling (optional)
psql -f migrations/009_create_weekly_benchmark_cron.sql
```

Or run them directly in Supabase SQL Editor.

### Step 2: Create Benchmark Jobs

For each job you want to benchmark, create a `benchmark_jobs` entry with ground truth data:

```sql
INSERT INTO benchmark_jobs (job_id, ground_truth_candidates, created_by_user_id)
VALUES (
  'your-job-uuid-here',
  '["candidate-uuid-1", "candidate-uuid-2", "candidate-uuid-3"]'::jsonb,
  auth.uid()
);
```

**Ground Truth**: Manually label which candidates are actually relevant for the job. These are the "correct answers" that the benchmark will compare against.

## API Usage

### Run Benchmark via Edge Function

```bash
POST /functions/v1/benchmark/{job_id}/run

Headers:
  Authorization: Bearer YOUR_ANON_KEY
  Content-Type: application/json

Body:
{
  "version": "v1"  // Optional, defaults to "v1"
}
```

### Response

```json
{
  "precision_5": 0.8,
  "precision_10": 0.75,
  "recall_5": 0.6,
  "recall_10": 0.8,
  "ndcg_5": 0.85,
  "ndcg_10": 0.82,
  "mrr": 0.9,
  "total_relevant_candidates": 10,
  "total_retrieved_candidates": 50
}
```

## Frontend Dashboard

Access the Benchmark Dashboard from the navigation menu:

1. Navigate to "Benchmark" in the header
2. Select a benchmark job from the dropdown
3. Choose a scoring version (or "All Versions")
4. Click "Run Benchmark" to execute
5. View results in charts and detailed table

## Automated Weekly Benchmarks

### Option 1: Using pg_cron (if available)

The migration `009_create_weekly_benchmark_cron.sql` includes a function and schedule setup. However, Supabase may not have `pg_cron` enabled by default.

### Option 2: External Scheduler

Use an external service (e.g., cron job, GitHub Actions, Vercel Cron) to call the benchmark endpoint weekly:

```bash
# Example cron job (runs every Monday at 2 AM)
0 2 * * 1 curl -X POST \
  'https://your-project.supabase.co/functions/v1/benchmark/{job_id}/run' \
  -H 'Authorization: Bearer YOUR_SERVICE_ROLE_KEY'
```

### Option 3: Supabase Edge Function Scheduler

Create a scheduled Edge Function that calls the benchmark endpoint for all jobs in `benchmark_schedule` table.

## Interpreting Results

### Good Metrics
- **Precision@10 > 0.7**: Most top 10 results are relevant
- **Recall@10 > 0.8**: Most relevant candidates are found in top 10
- **nDCG@10 > 0.8**: High-quality ranking with relevant candidates at the top
- **MRR > 0.8**: First relevant candidate appears early in results

### Improving Metrics

If metrics are low:

1. **Low Precision**: Too many irrelevant candidates in top results
   - Improve filtering logic
   - Adjust scoring weights
   - Enhance embedding quality

2. **Low Recall**: Missing relevant candidates
   - Expand query rewriting
   - Improve title/industry mapping
   - Adjust pre-score thresholds

3. **Low nDCG**: Relevant candidates ranked too low
   - Improve neural ranking layer
   - Enhance LLM post-ranking
   - Adjust final score fusion weights

4. **Low MRR**: First relevant candidate appears late
   - Improve initial ranking (pre-score)
   - Enhance title/industry matching bonuses

## Version Comparison

Track different scoring versions to compare algorithm improvements:

1. Run benchmark with `version: "v1"`
2. Make algorithm changes
3. Run benchmark with `version: "v2"`
4. Compare metrics in the dashboard

## Best Practices

1. **Ground Truth Quality**: Ensure ground truth is accurate and comprehensive
2. **Regular Benchmarks**: Run benchmarks after any algorithm changes
3. **Version Tracking**: Always specify a version when running benchmarks
4. **Multiple Jobs**: Benchmark multiple jobs to get aggregate metrics
5. **Documentation**: Document any changes that affect scoring

## Troubleshooting

### "Benchmark job not found"
- Ensure `benchmark_jobs` entry exists for the job_id
- Check that `ground_truth_candidates` is a non-empty array

### "Failed to get system rankings"
- Verify the `/match` endpoint is working
- Check that candidates and vacancies have embeddings
- Ensure the job_id is valid

### Low metrics
- Review ground truth quality
- Check if embeddings are up to date
- Verify matching pipeline is functioning correctly

## Next Steps

- Implement A/B testing framework (Step 19)
- Add more sophisticated metrics (MAP, F1@K)
- Create automated alerts for metric degradation
- Build aggregate reports across multiple jobs


