import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SystemRanking {
  candidate_id: string;
  final_score: number;
  rank: number;
}

/**
 * Compute Precision@K
 */
function computePrecisionAtK(
  systemRanking: SystemRanking[],
  groundTruth: string[],
  k: number
): number {
  const topK = systemRanking.slice(0, k);
  const relevantInTopK = topK.filter((item) => groundTruth.includes(item.candidate_id)).length;
  return relevantInTopK / k;
}

/**
 * Compute Recall@K
 */
function computeRecallAtK(
  systemRanking: SystemRanking[],
  groundTruth: string[],
  k: number
): number {
  if (groundTruth.length === 0) {
    return 0;
  }
  const topK = systemRanking.slice(0, k);
  const relevantInTopK = topK.filter((item) => groundTruth.includes(item.candidate_id)).length;
  return relevantInTopK / groundTruth.length;
}

/**
 * Compute DCG
 */
function computeDCG(systemRanking: SystemRanking[], groundTruth: string[], k: number): number {
  let dcg = 0;
  const topK = systemRanking.slice(0, k);
  
  for (let i = 0; i < topK.length; i++) {
    const item = topK[i];
    const relevance = groundTruth.includes(item.candidate_id) ? 1 : 0;
    const position = i + 1;
    dcg += relevance / Math.log2(position + 1);
  }
  
  return dcg;
}

/**
 * Compute IDCG
 */
function computeIDCG(groundTruth: string[], k: number): number {
  let idcg = 0;
  const numRelevant = Math.min(groundTruth.length, k);
  
  for (let i = 0; i < numRelevant; i++) {
    const position = i + 1;
    idcg += 1 / Math.log2(position + 1);
  }
  
  return idcg;
}

/**
 * Compute nDCG@K
 */
function computeNDCGAtK(
  systemRanking: SystemRanking[],
  groundTruth: string[],
  k: number
): number {
  const dcg = computeDCG(systemRanking, groundTruth, k);
  const idcg = computeIDCG(groundTruth, k);
  
  if (idcg === 0) {
    return 0;
  }
  
  return dcg / idcg;
}

/**
 * Compute MRR
 */
function computeMRR(systemRanking: SystemRanking[], groundTruth: string[]): number {
  for (let i = 0; i < systemRanking.length; i++) {
    if (groundTruth.includes(systemRanking[i].candidate_id)) {
      return 1 / (i + 1);
    }
  }
  return 0;
}

/**
 * Run benchmark for a job
 */
async function runBenchmark(
  supabase: any,
  jobId: string,
  version: string = 'v1'
): Promise<any> {
  // Step 1: Retrieve ground truth
  const { data: benchmarkJob, error: benchmarkError } = await supabase
    .from('benchmark_jobs')
    .select('ground_truth_candidates')
    .eq('job_id', jobId)
    .single();

  if (benchmarkError || !benchmarkJob) {
    throw new Error(
      `Benchmark job not found for job_id ${jobId}. Please create a benchmark_jobs entry first.`
    );
  }

  const groundTruth = benchmarkJob.ground_truth_candidates as string[];
  if (!Array.isArray(groundTruth) || groundTruth.length === 0) {
    throw new Error('Ground truth candidates must be a non-empty array');
  }

  // Step 2: Get system rankings by calling the match function
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
  // Try service role key first, fallback to anon key
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_ANON_KEY') ?? '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables (SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)');
  }

  // Call the match endpoint internally
  const matchResponse = await fetch(`${supabaseUrl}/functions/v1/match`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseServiceKey}`,
    },
    body: JSON.stringify({ vacancy_id: jobId }),
  });

  if (!matchResponse.ok) {
    const errorText = await matchResponse.text();
    throw new Error(`Failed to get system rankings: ${matchResponse.status} ${errorText}`);
  }

  const systemResults = await matchResponse.json();
  
  // Convert to SystemRanking format
  const systemRanking: SystemRanking[] = systemResults.map(
    (result: any, index: number) => ({
      candidate_id: result.candidate_id,
      final_score: result.final_score || 0,
      rank: index + 1,
    })
  );

  // Step 3: Compute all metrics
  const precision_5 = computePrecisionAtK(systemRanking, groundTruth, 5);
  const precision_10 = computePrecisionAtK(systemRanking, groundTruth, 10);
  const recall_5 = computeRecallAtK(systemRanking, groundTruth, 5);
  const recall_10 = computeRecallAtK(systemRanking, groundTruth, 10);
  const ndcg_5 = computeNDCGAtK(systemRanking, groundTruth, 5);
  const ndcg_10 = computeNDCGAtK(systemRanking, groundTruth, 10);
  const mrr = computeMRR(systemRanking, groundTruth);

  const metrics = {
    precision_5,
    precision_10,
    recall_5,
    recall_10,
    ndcg_5,
    ndcg_10,
    mrr,
    total_relevant_candidates: groundTruth.length,
    total_retrieved_candidates: systemRanking.length,
  };

  // Step 4: Store results in database
  const { error: insertError } = await supabase.from('matching_benchmark_results').insert({
    job_id: jobId,
    version,
    precision_5: metrics.precision_5,
    precision_10: metrics.precision_10,
    recall_5: metrics.recall_5,
    recall_10: metrics.recall_10,
    ndcg_5: metrics.ndcg_5,
    ndcg_10: metrics.ndcg_10,
    mrr: metrics.mrr,
    total_relevant_candidates: metrics.total_relevant_candidates,
    total_retrieved_candidates: metrics.total_retrieved_candidates,
    metadata: {
      system_ranking_count: systemRanking.length,
      ground_truth_count: groundTruth.length,
    },
  });

  if (insertError) {
    console.error('Failed to store benchmark results:', insertError);
    // Don't throw - metrics are still computed correctly
  }

  return metrics;
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
    // URL format: /functions/v1/benchmark/{job_id}/run
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(p => p); // Remove empty strings
    
    // Find 'benchmark' in path
    const benchmarkIndex = pathParts.indexOf('benchmark');
    
    if (benchmarkIndex === -1 || benchmarkIndex + 1 >= pathParts.length) {
      return new Response(
        JSON.stringify({ error: 'Invalid URL format. Expected: /benchmark/{job_id}/run' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const jobId = pathParts[benchmarkIndex + 1];
    const action = pathParts[benchmarkIndex + 2] || 'run';

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

    if (action !== 'run') {
      return new Response(
        JSON.stringify({ error: `Unknown action: ${action}. Expected 'run'` }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse version from request body (optional, defaults to 'v1')
    let version = 'v1';
    try {
      const body = await req.json();
      version = body.version || 'v1';
    } catch {
      // No body provided, use default version
    }

    console.log(`Running benchmark for job ${jobId} with version ${version}...`);

    // Run benchmark
    const metrics = await runBenchmark(supabase, jobId, version);

    console.log(`Benchmark completed for job ${jobId}. Precision@10: ${metrics.precision_10}`);

    return new Response(
      JSON.stringify(metrics),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in /benchmark endpoint:', error);
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

