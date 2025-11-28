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
 * Compute distance matrix for clustering
 */
function computeDistanceMatrix(vectors: number[][]): number[][] {
  const n = vectors.length;
  const distances: number[][] = [];

  for (let i = 0; i < n; i++) {
    distances[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
      } else {
        const similarity = cosineSimilarity(vectors[i], vectors[j]);
        distances[i][j] = 1 - similarity;
      }
    }
  }

  return distances;
}

/**
 * Simplified HDBSCAN clustering
 */
function hdbscanClustering(
  vectors: number[][],
  minClusterSize: number = 5,
  minSamples: number = 2
): number[] {
  const n = vectors.length;
  
  if (n < minClusterSize) {
    return new Array(n).fill(-1);
  }

  const distances = computeDistanceMatrix(vectors);
  const clusters: number[] = new Array(n).fill(-1);
  let currentClusterId = 0;
  const visited = new Set<number>();

  for (let i = 0; i < n; i++) {
    if (visited.has(i)) continue;

    const cluster: number[] = [i];
    visited.add(i);

    for (let j = i + 1; j < n; j++) {
      if (visited.has(j)) continue;
      
      const threshold = 0.3;
      if (distances[i][j] < threshold) {
        cluster.push(j);
        visited.add(j);
      }
    }

    if (cluster.length >= minClusterSize) {
      for (const idx of cluster) {
        clusters[idx] = currentClusterId;
      }
      currentClusterId++;
    } else {
      for (const idx of cluster) {
        clusters[idx] = -1;
      }
    }
  }

  return clusters;
}

/**
 * Derive cluster properties
 */
async function deriveClusterProperties(
  supabase: any,
  clusterId: number,
  jobIds: string[]
): Promise<void> {
  const { data: jobs, error: jobsError } = await supabase
    .from('vacancies')
    .select('title, skills_required, industry')
    .in('id', jobIds);

  if (jobsError || !jobs) {
    return;
  }

  const titles = jobs.map((j: any) => j.title).filter(Boolean) as string[];
  const titleFrequency = new Map<string, number>();
  titles.forEach((title: string) => {
    titleFrequency.set(title, (titleFrequency.get(title) || 0) + 1);
  });
  const topTitles = Array.from(titleFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([title]) => title);

  const allSkills: string[] = [];
  jobs.forEach((job: any) => {
    if (job.skills_required && Array.isArray(job.skills_required)) {
      allSkills.push(...job.skills_required);
    }
  });
  const skillFrequency = new Map<string, number>();
  allSkills.forEach((skill: string) => {
    skillFrequency.set(skill, (skillFrequency.get(skill) || 0) + 1);
  });
  const topSkills = Array.from(skillFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([skill]) => skill);

  const industries = jobs.map((j: any) => j.industry).filter(Boolean) as string[];
  const industryFrequency = new Map<string, number>();
  industries.forEach((industry: string) => {
    industryFrequency.set(industry, (industryFrequency.get(industry) || 0) + 1);
  });
  const topIndustries = Array.from(industryFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([industry]) => industry);

  await supabase
    .from('cluster_properties')
    .upsert({
      cluster_id: clusterId,
      representative_titles: topTitles,
      representative_skills: topSkills,
      representative_industries: topIndustries,
      job_count: jobs.length,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'cluster_id',
    });
}

/**
 * Run clustering pipeline
 */
async function runClustering(
  supabase: any,
  minClusterSize: number = 5,
  minSamples: number = 2
): Promise<{ clusterCount: number; noiseCount: number }> {
  // Load job vectors
  const { data, error } = await supabase
    .from('job_embeddings')
    .select('job_id, combined_vector')
    .not('combined_vector', 'is', null);

  if (error) {
    throw new Error(`Failed to load job vectors: ${error.message}`);
  }

  if (!data || data.length === 0) {
    throw new Error('No job vectors found. Generate embeddings first.');
  }

  const vectors = data.map((item: any) => ({
    job_id: item.job_id,
    vector: Array.isArray(item.combined_vector)
      ? item.combined_vector
      : JSON.parse(item.combined_vector || '[]'),
  }));

  const vectorArrays = vectors.map((v: any) => v.vector);

  // Run clustering
  const clusterAssignments = hdbscanClustering(vectorArrays, minClusterSize, minSamples);

  // Store cluster assignments
  const clusterRecords = vectors.map((v: any, idx: number) => ({
    cluster_id: clusterAssignments[idx],
    job_id: v.job_id,
  }));

  const validClusters = clusterRecords.filter((cr: any) => cr.cluster_id !== -1);
  const noiseCount = clusterRecords.length - validClusters.length;

  // Clear existing clusters
  await supabase
    .from('job_clusters')
    .delete()
    .neq('cluster_id', -999);

  // Insert new cluster assignments
  if (validClusters.length > 0) {
    const { error: insertError } = await supabase
      .from('job_clusters')
      .insert(validClusters);

    if (insertError) {
      throw new Error(`Failed to store cluster assignments: ${insertError.message}`);
    }
  }

  // Get unique cluster IDs
  const uniqueClusterIds = Array.from(new Set(clusterAssignments.filter((id: number) => id !== -1)));
  const clusterCount = uniqueClusterIds.length;

  // Derive cluster properties
  for (const clusterId of uniqueClusterIds) {
    const clusterJobs = clusterRecords.filter((cr: any) => cr.cluster_id === clusterId);
    const jobIds = clusterJobs.map((cj: any) => cj.job_id);
    await deriveClusterProperties(supabase, clusterId, jobIds);
  }

  return { clusterCount, noiseCount };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Parse request body for parameters
    let minClusterSize = 5;
    let minSamples = 2;

    try {
      const body = await req.json();
      minClusterSize = body.min_cluster_size || 5;
      minSamples = body.min_samples || 2;
    } catch {
      // Use defaults if no body provided
    }

    console.log(`Running clustering with minClusterSize=${minClusterSize}, minSamples=${minSamples}...`);

    const result = await runClustering(supabase, minClusterSize, minSamples);

    console.log(`Clustering complete: ${result.clusterCount} clusters, ${result.noiseCount} noise points`);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in /cluster-jobs endpoint:', error);
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


