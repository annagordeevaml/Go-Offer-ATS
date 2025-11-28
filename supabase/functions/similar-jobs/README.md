# Similar Jobs Edge Function

This Edge Function returns similar jobs from the same cluster as a given job.

## Endpoint

`GET /functions/v1/similar-jobs/{job_id}`

## Request

### URL Parameters
- `job_id` (UUID): The ID of the job/vacancy

### Query Parameters
- `limit` (optional, default: 10): Maximum number of similar jobs to return

## Response

Returns an array of similar jobs with similarity scores:

```json
[
  {
    "id": "uuid",
    "title": "Software Engineer",
    "location": "San Francisco, CA",
    "industry": "Software / SaaS",
    "skills_required": ["Python", "React", "TypeScript"],
    "job_text": "Full job description...",
    "similarity": 0.92
  },
  ...
]
```

## How It Works

1. Finds the cluster ID for the given job
2. Retrieves other jobs in the same cluster
3. Computes cosine similarity between the job's combined vector and similar jobs' vectors
4. Returns jobs sorted by similarity (highest first)

## Example Usage

```bash
curl -X GET \
  'https://your-project.supabase.co/functions/v1/similar-jobs/123e4567-e89b-12d3-a456-426614174000?limit=5' \
  -H 'Authorization: Bearer YOUR_ANON_KEY'
```

## Error Responses

- `400 Bad Request`: Invalid job_id format
- `404 Not Found`: Job not found or not in any cluster
- `500 Internal Server Error`: Failed to retrieve similar jobs

## Notes

- Jobs must have embeddings generated before clustering
- Jobs not in any cluster will return an empty array
- Similarity scores range from 0 to 1 (higher = more similar)


