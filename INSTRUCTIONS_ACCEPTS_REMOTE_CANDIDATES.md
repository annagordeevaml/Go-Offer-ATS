# Instructions: Add accepts_remote_candidates Column to Jobs Table

## Error
You're seeing this error because the `accepts_remote_candidates` column doesn't exist in the `jobs` table yet.

## Solution

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar

3. **Run the Migration Script**
   - Copy the contents of `add_accepts_remote_candidates_to_jobs.sql`
   - Paste it into the SQL Editor
   - Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac)

4. **Verify the Column Was Added**
   - Go to "Table Editor" → "jobs" table
   - You should see a new column `accepts_remote_candidates` of type `boolean`

## SQL Script Content

```sql
-- Add accepts_remote_candidates column to jobs table

ALTER TABLE public.jobs 
ADD COLUMN IF NOT EXISTS accepts_remote_candidates BOOLEAN DEFAULT false;

-- Create index for faster filtering
CREATE INDEX IF NOT EXISTS idx_jobs_accepts_remote_candidates 
ON public.jobs(accepts_remote_candidates);

COMMENT ON COLUMN public.jobs.accepts_remote_candidates IS 'Whether the job accepts remote candidates';
```

## After Running the Migration

1. Refresh your application
2. Try creating/editing a job again
3. The "Accept Remote Candidates?" checkbox should now work properly

## Note

The code has been temporarily updated to handle the missing column gracefully, but you should run the migration to enable full functionality.


