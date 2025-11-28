# Setup Admin Rights for anna@go-offer.us

This guide explains how to grant admin rights to `anna@go-offer.us` for both candidates and vacancies.

## Steps

### 1. Update Admin User Function

Run the SQL script `update_admin_user.sql` in Supabase Dashboard → SQL Editor.

This script updates the `is_admin_user()` function to recognize `anna@go-offer.us` as an admin user.

**What it does:**
- Updates `is_admin_user()` function to return `true` for both `admin@go-offer.us` and `anna@go-offer.us`
- Allows `anna@go-offer.us` to have full admin access to candidates table

### 2. Update Vacancies Permissions (Optional)

If you want `anna@go-offer.us` to have admin access to vacancies table, run `update_vacancies_admin_permissions.sql`.

**What it does:**
- Updates RLS policies for `vacancies` table
- Allows all authenticated users to view vacancies
- Restricts INSERT, UPDATE, DELETE to admin users only (including `anna@go-offer.us`)

### 3. Update Jobs Permissions (Optional)

If you want `anna@go-offer.us` to see and manage all jobs (not just their own), run `update_jobs_admin_permissions.sql`.

**What it does:**
- Updates RLS policies for `jobs` table
- Allows users to see/manage only their own jobs
- Allows admins (including `anna@go-offer.us`) to see and manage ALL jobs

## Verification

After running the scripts, verify that the function works:

```sql
-- Check if function was updated
SELECT 
  proname as function_name,
  prosrc as function_body
FROM pg_proc 
WHERE proname = 'is_admin_user';

-- The function body should contain: 'anna@go-offer.us'
```

## What Admin Rights Include

For **Candidates** table:
- ✅ View all candidates
- ✅ Insert new candidates
- ✅ Update any candidate
- ✅ Delete any candidate
- ✅ Normalize job titles for all candidates
- ✅ Generate embeddings for all candidates

For **Vacancies** table (if script is run):
- ✅ View all vacancies
- ✅ Insert new vacancies
- ✅ Update any vacancy
- ✅ Delete any vacancy

For **Jobs** table (if script is run):
- ✅ View all jobs (not just own)
- ✅ Insert jobs for any user
- ✅ Update any job
- ✅ Delete any job

## Important Notes

1. **Email must match exactly**: The email `anna@go-offer.us` must match exactly (case-sensitive) with the email in `auth.users` table.

2. **User must be authenticated**: The user must be logged in through Supabase Auth for the function to work.

3. **Function uses SECURITY DEFINER**: The `is_admin_user()` function uses `SECURITY DEFINER`, which allows it to bypass RLS restrictions to check the user's email.

4. **Multiple admins**: You can add more admin emails by modifying the function:
   ```sql
   RETURN user_email = 'admin@go-offer.us' 
      OR user_email = 'anna@go-offer.us'
      OR user_email = 'another-admin@go-offer.us';
   ```

## Troubleshooting

If `anna@go-offer.us` still doesn't have admin rights:

1. **Check email in auth.users**:
   ```sql
   SELECT id, email FROM auth.users WHERE email = 'anna@go-offer.us';
   ```

2. **Verify function was updated**:
   ```sql
   SELECT prosrc FROM pg_proc WHERE proname = 'is_admin_user';
   ```

3. **Test the function** (while logged in as anna@go-offer.us):
   ```sql
   SELECT public.is_admin_user();
   -- Should return: true
   ```

4. **Check RLS policies**:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'candidates';
   ```


