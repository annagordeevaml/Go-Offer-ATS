# Deploy Match Edge Function

## Problem
CORS error when calling `/match` Edge Function from the frontend.

## Solution
Deploy the updated Edge Function to Supabase.

## Steps to Deploy

### Option 1: Using Supabase CLI (Recommended)

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase**:
   ```bash
   supabase login
   ```

3. **Link your project**:
   ```bash
   supabase link --project-ref hyoqcxaielpvmmuanogv
   ```

4. **Deploy the function**:
   ```bash
   supabase functions deploy match
   ```

### Option 2: Using Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to your project: https://supabase.com/dashboard
   - Navigate to "Edge Functions" in the left sidebar

2. **Create/Update the function**
   - If the function doesn't exist, click "Create a new function"
   - Name it: `match`
   - Copy the contents of `supabase/functions/match/index.ts`
   - Paste into the editor
   - Click "Deploy"

3. **Set Environment Variables**
   - Go to "Project Settings" → "Edge Functions"
   - Add/verify these secrets:
     - `SUPABASE_URL` (should be auto-set)
     - `SUPABASE_ANON_KEY` (should be auto-set)
     - `OPENAI_API_KEY` (your OpenAI API key)

### Option 3: Manual Upload (if CLI doesn't work)

1. **Zip the function**:
   ```bash
   cd supabase/functions/match
   zip -r match.zip .
   ```

2. **Upload via Dashboard**:
   - Go to Edge Functions in Supabase Dashboard
   - Click "Upload function"
   - Select the `match.zip` file
   - Set the function name to `match`

## Verify Deployment

After deployment, test the function:

```bash
curl -X POST https://hyoqcxaielpvmmuanogv.supabase.co/functions/v1/match \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"vacancy_id": "test-uuid"}'
```

## CORS Fix

The updated function now:
- Returns status 204 for OPTIONS requests (instead of 200)
- Includes `Access-Control-Allow-Methods` header
- Properly handles CORS preflight requests

## Troubleshooting

If you still get CORS errors:
1. Check that the function is deployed (should appear in Edge Functions list)
2. Verify environment variables are set correctly
3. Check browser console for specific error messages
4. Try clearing browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)


