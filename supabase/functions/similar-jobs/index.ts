import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Compute cosine similarity between two vectors
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0;
  }

  return dotProduct / denominator;
}

/**
 * Get similar jobs from the same cluster
 */
async function getSimilarJobs(
  supabase: any,
  jobId: string,
  limit: number = 10
): Promise<any[]> {
  // Get cluster ID for this job
  const { data: clusterData, error: clusterError } = await supabase
    .from('job_clusters')
    .select('cluster_id')
    .eq('job_id', jobId)
    .single();

  if (clusterError || !clusterData) {
    // Job not in any cluster, return empty
    return [];
  }

  const clusterId = clusterData.cluster_id;

  // Get other jobs in the same cluster
  const { data: clusterJobs, error: jobsError } = await supabase
    .from('job_clusters')
    .select('job_id')
    .eq('cluster_id', clusterId)
    .neq('job_id', jobId)
    .limit(limit);

  if (jobsError || !clusterJobs || clusterJobs.length === 0) {
    return [];
  }

  const similarJobIds = clusterJobs.map((cj: any) => cj.job_id);

  // Fetch job details
  const { data: jobs, error: fetchError } = await supabase
    .from('vacancies')
    .select('id, title, location, industry, skills_required, job_text')
    .in('id', similarJobIds);

  if (fetchError || !jobs) {
    return [];
  }

  // Compute similarity scores using combined vectors
  const { data: jobEmbedding, error: embeddingError } = await supabase
    .from('job_embeddings')
    .select('combined_vector')
    .eq('job_id', jobId)
    .single();

  if (!embeddingError && jobEmbedding?.combined_vector) {
    const sourceVector = Array.isArray(jobEmbedding.combined_vector)
      ? jobEmbedding.combined_vector
      : JSON.parse(jobEmbedding.combined_vector || '[]');

    // Get embeddings for similar jobs
    const { data: similarEmbeddings, error: similarEmbeddingsError } = await supabase
      .from('job_embeddings')
      .select('job_id, combined_vector')
      .in('job_id', similarJobIds);

    if (!similarEmbeddingsError && similarEmbeddings) {
      // Compute similarity scores
      const jobsWithScores = jobs.map((job: any) => {
        const embedding = similarEmbeddings.find((e: any) => e.job_id === job.id);
        if (!embedding?.combined_vector) {
          return { ...job, similarity: 0 };
        }

        const vector = Array.isArray(embedding.combined_vector)
          ? embedding.combined_vector
          : JSON.parse(embedding.combined_vector || '[]');

        const similarity = cosineSimilarity(sourceVector, vector);
        return { ...job, similarity };
      });

      // Sort by similarity descending
      jobsWithScores.sort((a: any, b: any) => b.similarity - a.similarity);
      return jobsWithScores.slice(0, limit);
    }
  }

  return jobs;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Extract job_id from URL path
    // URL format: /functions/v1/similar-jobs/{job_id}
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p);
    
    // Find 'similar-jobs' in path
    const similarJobsIndex = pathParts.indexOf('similar-jobs');
    
    if (similarJobsIndex === -1 || similarJobsIndex + 1 >= pathParts.length) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format. Expected: /similar-jobs/{job_id}' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const jobId = pathParts[similarJobsIndex + 1];

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid job_id format. Must be a valid UUID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get limit from query params (default 10)
    const limit = parseInt(url.searchParams.get('limit') || '10', 10);

    console.log(`Getting similar jobs for ${jobId} (limit: ${limit})...`);

    // Get similar jobs
    const similarJobs = await getSimilarJobs(supabase, jobId, limit);

    console.log(`Found ${similarJobs.length} similar jobs`);

    return new Response(
      JSON.stringify(similarJobs),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in /similar-jobs endpoint:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});


