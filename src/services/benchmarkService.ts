import { supabase } from '../lib/supabaseClient';

export interface BenchmarkMetrics {
  precision_5: number;
  precision_10: number;
  recall_5: number;
  recall_10: number;
  ndcg_5: number;
  ndcg_10: number;
  mrr: number;
  total_relevant_candidates: number;
  total_retrieved_candidates: number;
}

export interface SystemRanking {
  candidate_id: string;
  final_score: number;
  rank: number; // 1-based rank
}

/**
 * Compute Precision@K
 * Precision@K = (# of relevant candidates in top K) / K
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
 * Recall@K = (# of relevant candidates in top K) / (total relevant candidates)
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
 * Compute DCG (Discounted Cumulative Gain)
 */
function computeDCG(systemRanking: SystemRanking[], groundTruth: string[], k: number): number {
  let dcg = 0;
  const topK = systemRanking.slice(0, k);
  
  for (let i = 0; i < topK.length; i++) {
    const item = topK[i];
    const relevance = groundTruth.includes(item.candidate_id) ? 1 : 0;
    const position = i + 1; // 1-based position
    dcg += relevance / Math.log2(position + 1);
  }
  
  return dcg;
}

/**
 * Compute Ideal DCG (IDCG) - DCG of the perfect ranking
 */
function computeIDCG(groundTruth: string[], k: number): number {
  // Ideal ranking: all relevant items first, then irrelevant ones
  // Since we only have binary relevance (1 or 0), IDCG is just DCG of all 1s
  let idcg = 0;
  const numRelevant = Math.min(groundTruth.length, k);
  
  for (let i = 0; i < numRelevant; i++) {
    const position = i + 1;
    idcg += 1 / Math.log2(position + 1);
  }
  
  return idcg;
}

/**
 * Compute nDCG@K (Normalized Discounted Cumulative Gain)
 * nDCG@K = DCG@K / IDCG@K
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
 * Compute MRR (Mean Reciprocal Rank)
 * MRR = 1 / rank of first relevant candidate
 */
function computeMRR(systemRanking: SystemRanking[], groundTruth: string[]): number {
  for (let i = 0; i < systemRanking.length; i++) {
    if (groundTruth.includes(systemRanking[i].candidate_id)) {
      return 1 / (i + 1); // i+1 is the rank (1-based)
    }
  }
  return 0; // No relevant candidate found
}

/**
 * Run benchmark for a specific job
 * 
 * @param jobId - UUID of the job/vacancy
 * @param version - Scoring version identifier (e.g., 'v1', 'v2')
 * @returns Benchmark metrics
 */
export async function runBenchmark(
  jobId: string,
  version: string = 'v1'
): Promise<BenchmarkMetrics> {
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

  // Step 2: Retrieve system rankings by calling the match endpoint
  // We'll use the matching service to get ranked candidates
  const matchResponse = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/match`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ vacancy_id: jobId }),
    }
  );

  if (!matchResponse.ok) {
    throw new Error(`Failed to get system rankings: ${matchResponse.statusText}`);
  }

  const systemResults = await matchResponse.json();
  
  // Convert to SystemRanking format with ranks
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

  const metrics: BenchmarkMetrics = {
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

/**
 * Get benchmark results for a specific job
 */
export async function getBenchmarkResults(jobId: string) {
  const { data, error } = await supabase
    .from('matching_benchmark_results')
    .select('*')
    .eq('job_id', jobId)
    .order('timestamp', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch benchmark results: ${error.message}`);
  }

  return data;
}

/**
 * Get benchmark results grouped by version
 */
export async function getBenchmarkResultsByVersion(version: string) {
  const { data, error } = await supabase
    .from('matching_benchmark_results')
    .select('*')
    .eq('version', version)
    .order('timestamp', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch benchmark results by version: ${error.message}`);
  }

  return data;
}

/**
 * Get all benchmark jobs
 */
export async function getAllBenchmarkJobs() {
  const { data, error } = await supabase
    .from('benchmark_jobs')
    .select('*, vacancies(title, location, industry)')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to fetch benchmark jobs: ${error.message}`);
  }

  return data;
}


