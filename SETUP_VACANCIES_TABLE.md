# Setup Vacancies Table for Matching Engine

## Problem
The matching engine requires a `vacancies` table, but it doesn't exist in your Supabase database yet.

## Solution
Run the SQL script `create_vacancies_table.sql` in your Supabase SQL Editor.

## Steps

1. **Open Supabase Dashboard**
   - Go to your Supabase project: https://supabase.com/dashboard
   - Select your project

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Script**
   - Open the file `create_vacancies_table.sql` in your project
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press `Ctrl+Enter` (Windows/Linux) or `Cmd+Enter` (Mac)

4. **Verify**
   - The script should complete without errors
   - You can verify the table was created by running:
     ```sql
     SELECT * FROM vacancies LIMIT 1;
     ```

## What the Script Does

- Creates the `vacancies` table with all required fields:
  - `id` (UUID, primary key)
  - `title` (job title)
  - `location` (job location)
  - `industry` (industry)
  - `skills_required` (array of skills)
  - `job_text` (full job description)
  - `meta_embedding` (vector embedding for metadata)
  - `content_embedding` (vector embedding for full text)
  - `created_at` (timestamp)

- Creates indexes for better query performance
- Sets up Row Level Security (RLS) policies to allow access

## After Setup

Once the table is created, you can:
1. Go to "My Jobs" page
2. Click "Find Matches" on any job card
3. The system will automatically create a vacancy from the job and run matching

## Troubleshooting

If you get an error about `vector` type:
- Make sure the `pgvector` extension is enabled
- The script includes `CREATE EXTENSION IF NOT EXISTS vector;` which should handle this

If you get permission errors:
- Make sure you're running the script as a database admin
- Check that RLS policies are correctly set up


