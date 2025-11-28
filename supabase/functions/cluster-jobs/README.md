# Cluster Jobs Edge Function

This Edge Function runs the HDBSCAN clustering algorithm on all jobs to group them into semantic clusters.

## Endpoint

`POST /functions/v1/cluster-jobs`

## Request

### Body (optional)
```json
{
  "min_cluster_size": 5,  // Minimum jobs per cluster (default: 5)
  "min_samples": 2          // Minimum samples in neighborhood (default: 2)
}
```

## Response

Returns clustering results:

```json
{
  "clusterCount": 12,
  "noiseCount": 3
}
```

## How It Works

1. Loads all job combined vectors from `job_embeddings` table
2. Computes distance matrix using cosine distance
3. Runs HDBSCAN clustering algorithm
4. Stores cluster assignments in `job_clusters` table
5. Derives cluster properties (titles, skills, industries) and stores in `cluster_properties` table

## Prerequisites

- All jobs must have embeddings generated (use `generateJobEmbeddings()` first)
- `job_embeddings` table must contain `combined_vector` for jobs

## Example Usage

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/cluster-jobs' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "min_cluster_size": 5,
    "min_samples": 2
  }'
```

## Parameters

### min_cluster_size
Minimum number of jobs required to form a cluster. Jobs that don't meet this threshold are marked as "noise" (cluster_id = -1).

**Recommendations:**
- Small dataset (< 50 jobs): 3
- Medium dataset (50-200 jobs): 5
- Large dataset (> 200 jobs): 10

### min_samples
Minimum number of samples in a neighborhood for a point to be considered a core point. Lower values create more clusters but may include outliers.

## Error Responses

- `400 Bad Request`: Invalid parameters
- `500 Internal Server Error`: Failed to run clustering (check if embeddings exist)

## Notes

- Clustering can take several minutes for large datasets
- Existing cluster assignments are cleared before new clustering
- Jobs without embeddings are skipped
- Cluster properties are automatically derived after clustering

## Performance

For large datasets (> 1000 jobs), consider:
- Running clustering in batches
- Using a more efficient clustering library (e.g., scikit-learn via Python)
- Pre-filtering jobs by industry or location


