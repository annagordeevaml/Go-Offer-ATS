# Benchmark Edge Function

This Edge Function runs performance benchmarks for the candidate-vacancy matching engine.

## Endpoint

`POST /functions/v1/benchmark/{job_id}/run`

## Request

### URL Parameters
- `job_id` (UUID): The ID of the job/vacancy to benchmark

### Body (optional)
```json
{
  "version": "v1"  // Scoring version identifier (default: "v1")
}
```

## Response

Returns benchmark metrics:

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

## Metrics Explained

- **Precision@K**: Fraction of top K results that are relevant
- **Recall@K**: Fraction of relevant candidates found in top K
- **nDCG@K**: Normalized Discounted Cumulative Gain at K (quality of ranking)
- **MRR**: Mean Reciprocal Rank (1 / rank of first relevant candidate)

## Prerequisites

1. A `benchmark_jobs` entry must exist for the job_id with `ground_truth_candidates` (array of relevant candidate IDs)
2. The matching engine must be functional (the `/match` endpoint must work)

## Example Usage

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/benchmark/123e4567-e89b-12d3-a456-426614174000/run' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{"version": "v1"}'
```

## Error Responses

- `400 Bad Request`: Invalid job_id format or missing benchmark_jobs entry
- `500 Internal Server Error`: Failed to retrieve rankings or compute metrics


