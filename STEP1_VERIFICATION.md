# Step 1 Verification: Database Schema

## Requirements from Step 1:

1. Enable pgvector extension
2. Create candidates table with:
   - id uuid PRIMARY KEY
   - full_name text
   - general_title text
   - location text
   - industry text
   - skills text[]
   - resume_text text
   - meta_embedding vector(1536)
   - content_embedding vector(1536)
   - created_at timestamptz

3. Create vacancies table with:
   - id uuid PRIMARY KEY
   - title text
   - general_title text
   - location text
   - industry text
   - skills_required text[]
   - job_text text
   - meta_embedding vector(1536)
   - content_embedding vector(1536)
   - created_at timestamptz

4. Add indexes for vector search

## Current Status:

✅ Migration file exists: `migrations/001_create_matching_engine_schema.sql`
✅ Schema matches requirements
✅ Indexes are created

## Issue Found:

There are TWO different candidate table schemas:
1. `migrations/001_create_matching_engine_schema.sql` - for matching engine (uuid, with vectors)
2. `create_candidates_table.sql` - for UI (bigserial, without vectors)

These need to be reconciled or kept separate with proper mapping.


