# Match Edge Function

This Edge Function implements the pre-score matching layer for candidate-vacancy matching.

## Endpoint

`POST /functions/v1/match`

## Request

### Body
```json
{
  "vacancy_id": "uuid"
}
```

## Response

Returns an array of top 50 candidates with their pre-score metrics:

```json
[
  {
    "candidate_id": "uuid",
    "meta_similarity": 0.85,
    "content_similarity": 0.92,
    "pre_score": 0.8965
  },
  ...
]
```

## How It Works

1. Validates `vacancy_id` from request body
2. Calls SQL function `match_candidates_pre_score(vacancy_uuid)`
3. SQL function computes:
   - `meta_similarity` = cosine similarity between vacancy.meta_embedding and candidate.meta_embedding
   - `content_similarity` = cosine similarity between vacancy.content_embedding and candidate.content_embedding
   - `pre_score` = 0.35 * meta_similarity + 0.65 * content_similarity
4. Returns top 50 candidates sorted by pre_score DESC

## Error Responses

- `400 Bad Request`: Missing or invalid `vacancy_id`
- `500 Internal Server Error`: Failed to query database or compute matches

## Example Usage

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/match' \
  -H 'Authorization: Bearer YOUR_ANON_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "vacancy_id": "123e4567-e89b-12d3-a456-426614174000"
  }'
```

## Notes

- This is the PRE-SCORE ONLY version
- Neural ranking and LLM ranking are not implemented yet
- Requires `match_candidates_pre_score` SQL function to be created (migration 002)
