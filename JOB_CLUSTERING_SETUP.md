# Job Clustering Setup Guide

This guide explains how to set up and use the Semantic Job Clustering system.

## Overview

The clustering system automatically groups similar job vacancies into clusters based on semantic meaning (vector embeddings), not just keywords. This enables:

- **Better matching**: Candidates who match one job in a cluster are more likely to match other jobs in the same cluster
- **Job discovery**: Find similar jobs to a given vacancy
- **Cluster insights**: Understand common patterns (titles, skills, industries) within clusters

## Database Setup

### Step 1: Run Migration

Execute the SQL migration:

```bash
psql -f migrations/010_create_job_clustering_tables.sql
```

Or run it directly in Supabase SQL Editor.

This creates:
- `job_embeddings` - Stores title, description, and combined vectors for each job
- `job_clusters` - Maps jobs to their assigned clusters
- `cluster_properties` - Stores aggregated properties (titles, skills, industries) for each cluster

## Workflow

### Step 1: Generate Job Embeddings

Before clustering, you need to generate embeddings for all jobs:

```typescript
import { generateJobEmbeddings } from './services/jobClusteringService';

// Generate embeddings for a single job
await generateJobEmbeddings(jobId);
```

Or generate for all jobs:

```typescript
// Fetch all vacancies
const { data: vacancies } = await supabase
  .from('vacancies')
  .select('id');

// Generate embeddings for each
for (const vacancy of vacancies) {
  await generateJobEmbeddings(vacancy.id);
}
```

### Step 2: Run Clustering

Run the clustering algorithm:

**Via Edge Function:**
```bash
POST /functions/v1/cluster-jobs

Body:
{
  "min_cluster_size": 5,  // Optional, default: 5
  "min_samples": 2         // Optional, default: 2
}
```

**Via TypeScript:**
```typescript
import { runJobClustering } from './services/jobClusteringService';

const result = await runJobClustering(5, 2);
console.log(`Created ${result.clusterCount} clusters, ${result.noiseCount} noise points`);
```

### Step 3: Cluster Properties

Cluster properties are automatically derived after clustering:
- **Representative Titles**: 3 most frequent job titles in the cluster
- **Representative Skills**: 5 most common skills in the cluster
- **Representative Industries**: 3 most common industries in the cluster

## API Endpoints

### Get Similar Jobs

```bash
GET /functions/v1/similar-jobs/{job_id}?limit=10
```

Returns up to 10 most similar jobs from the same cluster, sorted by similarity score.

**Response:**
```json
[
  {
    "id": "uuid",
    "title": "Software Engineer",
    "location": "San Francisco, CA",
    "industry": "Software / SaaS",
    "skills_required": ["Python", "React", "TypeScript"],
    "similarity": 0.92
  },
  ...
]
```

### Run Clustering

```bash
POST /functions/v1/cluster-jobs

Body:
{
  "min_cluster_size": 5,
  "min_samples": 2
}
```

**Response:**
```json
{
  "clusterCount": 12,
  "noiseCount": 3
}
```

## Integration with Matching

The clustering system automatically enhances matching scores:

**Cluster Reinforcement Score**: If a candidate matches other jobs in the same cluster as the current job, they receive a bonus (up to +0.1) to their final score.

This is automatically applied in `computeFinalScores()` in the matching service.

## Clustering Algorithm

### HDBSCAN Parameters

- **min_cluster_size**: Minimum number of jobs required to form a cluster (default: 5)
- **min_samples**: Minimum number of samples in a neighborhood (default: 2)

### Distance Metric

Uses cosine distance (1 - cosine similarity) between combined job vectors.

### Threshold

Jobs within distance < 0.3 are considered neighbors.

## Best Practices

1. **Generate embeddings first**: Always generate embeddings for all jobs before clustering
2. **Regular re-clustering**: Re-run clustering when you add significant new jobs
3. **Adjust parameters**: Tune `min_cluster_size` based on your job volume:
   - Small dataset (< 50 jobs): `min_cluster_size = 3`
   - Medium dataset (50-200 jobs): `min_cluster_size = 5`
   - Large dataset (> 200 jobs): `min_cluster_size = 10`
4. **Monitor noise**: High noise count may indicate:
   - Jobs are too diverse
   - Need to lower `min_cluster_size`
   - Need to adjust distance threshold

## Troubleshooting

### "No job vectors found"
- Generate embeddings first using `generateJobEmbeddings()`

### "All jobs assigned to noise"
- Lower `min_cluster_size` parameter
- Check if embeddings are correctly generated
- Verify job descriptions are not empty

### Low similarity scores
- Ensure embeddings are up to date
- Check that job descriptions are meaningful (not just titles)

### Performance issues
- For large datasets (> 1000 jobs), consider:
  - Running clustering in batches
  - Using a more efficient clustering library (e.g., scikit-learn via Python)
  - Pre-filtering jobs by industry or location

## Advanced: Using External Clustering Libraries

For production use with large datasets, consider:

1. **Python + scikit-learn**: Export vectors, run HDBSCAN in Python, import results
2. **PostgreSQL extensions**: Use `pg_ml` or similar for in-database clustering
3. **Batch processing**: Process clusters in batches to avoid memory issues

## Example: Full Pipeline

```typescript
// 1. Generate embeddings for all jobs
const { data: vacancies } = await supabase.from('vacancies').select('id');
for (const v of vacancies) {
  await generateJobEmbeddings(v.id);
}

// 2. Run clustering
const result = await runJobClustering(5, 2);
console.log(`Created ${result.clusterCount} clusters`);

// 3. Get similar jobs for a specific job
const similar = await getSimilarJobs(jobId, 10);
console.log(`Found ${similar.length} similar jobs`);
```

## Next Steps

- Implement cluster visualization (PCA reduction for 2D/3D visualization)
- Add cluster-based job recommendations
- Create cluster analytics dashboard
- Implement incremental clustering (add new jobs without re-clustering all)


