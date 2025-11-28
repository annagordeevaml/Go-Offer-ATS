import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface FinalScoredCandidate {
  candidate_id: string;
  pre_score: number;
  neural_rank_score: number;
  llm_score: number;
  final_score: number;
}

interface PreScoreMatchResult {
  candidate_id: string;
  meta_similarity: number;
  content_similarity: number;
  pre_score: number;
}

interface NeuralRankedCandidate {
  candidate_id: string;
  pre_score: number;
  neural_rank_score: number;
}

interface LLMPostRankedCandidate {
  candidate_id: string;
  pre_score: number;
  neural_rank_score: number;
  llm_score: number;
}

interface CandidateBlock {
  candidate_id: string;
  resume_text: string;
}

interface BatchLLMResult {
  candidate_id: string;
  llm_score: number;
  explanation: string;
}

interface FinalScoredCandidate {
  candidate_id: string;
  pre_score: number;
  neural_rank_score: number;
  llm_score: number;
  final_score: number;
}

interface CandidateMatchResult {
  candidate_id: string;
  pre_score: number;
  neural_rank_score: number;
  llm_score: number;
  final_score: number;
  explanation?: string;
}

/**
 * Get top 50 candidates by pre-score for a given vacancy
 * Calls the SQL function match_candidates_pre_score
 */
async function getTop50CandidatesByPreScore(
  supabase: any,
  vacancyId: string
): Promise<PreScoreMatchResult[]> {
  const { data, error } = await supabase.rpc('match_candidates_pre_score', {
    vacancy_uuid: vacancyId,
  });

  if (error) {
    throw new Error(`Failed to get pre-score matches: ${error.message}`);
  }

  if (!data) {
    return [];
  }

  return data as PreScoreMatchResult[];
}

/**
 * Get neural rank score by comparing job text and resume text using OpenAI
 * Checks cache first (7 days validity)
 */
async function getNeuralRankScore(
  supabase: any,
  openai: OpenAI,
  vacancyId: string,
  candidateId: string,
  vacancyText: string,
  resumeText: string
): Promise<number> {
  // Check cache first
  const { data: cacheEntry, error: cacheError } = await supabase
    .from('match_cache')
    .select('neural_rank_score, updated_at')
    .eq('vacancy_id', vacancyId)
    .eq('candidate_id', candidateId)
    .single();

  if (!cacheError && cacheEntry && cacheEntry.neural_rank_score !== null) {
    const cacheAge = Date.now() - new Date(cacheEntry.updated_at).getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    if (cacheAge < sevenDaysInMs) {
      console.log(`Using cached neural_rank_score for candidate ${candidateId}`);
      return cacheEntry.neural_rank_score;
    }
  }

  // Cache miss or expired - compute new value
  const prompt = `You are a semantic ranking model.
Compare the following job description and candidate resume.
Return a single float number between 0 and 1 based on functional similarity.

Job:

${vacancyText.trim()}

Resume:

${resumeText.trim()}

Return ONLY the number.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'You are a semantic ranking model. Return only a numeric score between 0 and 1.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 10,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  const score = parseFloat(content);
  if (isNaN(score)) {
    throw new Error(`Failed to parse neural rank score: "${content}" is not a valid number`);
  }

  const finalScore = Math.max(0, Math.min(1, score));

  // Update cache
  await supabase
    .from('match_cache')
    .upsert({
      vacancy_id: vacancyId,
      candidate_id: candidateId,
      neural_rank_score: finalScore,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'vacancy_id,candidate_id',
    });

  return finalScore;
}

/**
 * Get top 10 candidates ranked by neural rank score
 */
async function getTop10NeuralRankedCandidates(
  supabase: any,
  openai: OpenAI,
  vacancyId: string
): Promise<NeuralRankedCandidate[]> {
  // Step 1: Get top 50 candidates from pre-score layer
  const preScoreResults = await getTop50CandidatesByPreScore(supabase, vacancyId);

  if (preScoreResults.length === 0) {
    return [];
  }

  // Step 2: Fetch vacancy job_text
  const { data: vacancy, error: vacancyError } = await supabase
    .from('vacancies')
    .select('job_text')
    .eq('id', vacancyId)
    .single();

  if (vacancyError || !vacancy) {
    throw new Error(`Failed to fetch vacancy: ${vacancyError?.message || 'Vacancy not found'}`);
  }

  const vacancyText = vacancy.job_text || '';
  if (!vacancyText.trim()) {
    throw new Error('Vacancy job_text is empty');
  }

  // Step 3: Neural ranking - get top 10
  const neuralRankedCandidates: NeuralRankedCandidate[] = [];

  for (const candidate of preScoreResults.slice(0, 50)) {
    try {
      const { data: candidateData, error: candidateError } = await supabase
        .from('candidates')
        .select('resume_text')
        .eq('id', candidate.candidate_id)
        .single();

      if (candidateError || !candidateData || !candidateData.resume_text?.trim()) {
        continue;
      }

      const neuralRankScore = await getNeuralRankScore(supabase, openai, vacancyId, candidate.candidate_id, vacancyText, candidateData.resume_text);

      neuralRankedCandidates.push({
        candidate_id: candidate.candidate_id,
        pre_score: candidate.pre_score,
        neural_rank_score: neuralRankScore,
      });
    } catch (error) {
      console.error(`Error processing candidate ${candidate.candidate_id} for neural ranking:`, error);
      continue;
    }
  }

  // Sort by neural_rank_score DESC and take top 10
  neuralRankedCandidates.sort((a, b) => b.neural_rank_score - a.neural_rank_score);
  const top10Neural = neuralRankedCandidates.slice(0, 10);

  return top10Neural;
}

/**
 * Get LLM post-rank score by evaluating job and resume match using OpenAI
 * Checks cache first (7 days validity)
 */
async function getLLMPostRankScore(
  supabase: any,
  openai: OpenAI,
  vacancyId: string,
  candidateId: string,
  vacancyText: string,
  resumeText: string
): Promise<number> {
  // Check cache first
  const { data: cacheEntry, error: cacheError } = await supabase
    .from('match_cache')
    .select('llm_score, updated_at')
    .eq('vacancy_id', vacancyId)
    .eq('candidate_id', candidateId)
    .single();

  if (!cacheError && cacheEntry && cacheEntry.llm_score !== null) {
    const cacheAge = Date.now() - new Date(cacheEntry.updated_at).getTime();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    if (cacheAge < sevenDaysInMs) {
      console.log(`Using cached llm_score for candidate ${candidateId}`);
      return cacheEntry.llm_score;
    }
  }

  // Cache miss or expired - compute new value
  const prompt = `You are an AI recruiting assistant.
Evaluate the match between the following job description and candidate resume.

Consider:
- functional responsibility overlap
- relevant experience depth
- industry/domain match
- growth/leadership indicators
- seniority alignment
- similarity of metrics and achievements

Return a single float number from 0 to 1.
Return only the number. No explanation.

Job:

${vacancyText.trim()}

Resume:

${resumeText.trim()}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an AI recruiting assistant. Return only a numeric score between 0 and 1. No explanation.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    max_tokens: 10,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  const score = parseFloat(content);
  if (isNaN(score)) {
    throw new Error(`Failed to parse LLM post-rank score: "${content}" is not a valid number`);
  }

  const finalScore = Math.max(0, Math.min(1, score));

  // Update cache
  await supabase
    .from('match_cache')
    .upsert({
      vacancy_id: vacancyId,
      candidate_id: candidateId,
      llm_score: finalScore,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'vacancy_id,candidate_id',
    });

  return finalScore;
}

/**
 * Batch LLM calls for explanations and llm_score
 */
async function batchLLMExplanations(
  openai: OpenAI,
  vacancyText: string,
  candidateBlocks: CandidateBlock[]
): Promise<BatchLLMResult[]> {
  if (candidateBlocks.length === 0) {
    return [];
  }

  if (candidateBlocks.length > 20) {
    throw new Error('Batch size cannot exceed 20 candidates');
  }

  // Build candidate list for prompt
  const candidateList = candidateBlocks.map((block, index) => {
    return `Candidate ${index + 1} (ID: ${block.candidate_id}):
${block.resume_text}`;
  }).join('\n\n---\n\n');

  const prompt = `You are an AI recruiting assistant.
Evaluate the match between the following job description and multiple candidate resumes.

For each candidate, provide:
1. llm_score: A float number from 0 to 1 based on:
   - functional responsibility overlap
   - relevant experience depth
   - industry/domain match
   - growth/leadership indicators
   - seniority alignment
   - similarity of metrics and achievements

2. explanation: A short 1-2 sentence explanation focusing on:
   - functional experience
   - relevant achievements
   - industry match
   - role seniority
   Do NOT include weaknesses.

Job Description:

${vacancyText.trim()}

Candidates:

${candidateList}

Return ONLY valid JSON in this exact format:
{
  "results": [
    {
      "candidate_id": "uuid",
      "llm_score": 0.85,
      "explanation": "1-2 sentence text"
    }
  ]
}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an AI recruiting assistant. Return ONLY valid JSON. Do not include any text before or after the JSON.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.3,
    response_format: { type: 'json_object' },
    max_tokens: 2000,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  // Parse JSON response
  let parsedResponse: { results: BatchLLMResult[] };
  try {
    parsedResponse = JSON.parse(content);
  } catch (parseError) {
    // Try to extract JSON from markdown code blocks if present
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      parsedResponse = JSON.parse(jsonMatch[1]);
    } else {
      throw new Error(`Failed to parse JSON response: ${content}`);
    }
  }

  if (!parsedResponse.results || !Array.isArray(parsedResponse.results)) {
    throw new Error('Invalid response format: missing results array');
  }

  // Validate and normalize results
  const results: BatchLLMResult[] = parsedResponse.results.map((result: any) => {
    const llmScore = typeof result.llm_score === 'number' 
      ? Math.max(0, Math.min(1, result.llm_score))
      : parseFloat(result.llm_score || '0');

    if (isNaN(llmScore)) {
      throw new Error(`Invalid llm_score for candidate ${result.candidate_id}: ${result.llm_score}`);
    }

    return {
      candidate_id: result.candidate_id,
      llm_score: llmScore,
      explanation: result.explanation || 'Explanation unavailable',
    };
  });

  return results;
}

/**
 * Get LLM post-ranking for top 10 candidates using batch processing
 */
async function getLLMPostRanking(
  supabase: any,
  openai: OpenAI,
  vacancyId: string,
  neuralRankedCandidates: NeuralRankedCandidate[]
): Promise<LLMPostRankedCandidate[]> {
  if (neuralRankedCandidates.length === 0) {
    return [];
  }

  // Fetch vacancy job_text
  const { data: vacancy, error: vacancyError } = await supabase
    .from('vacancies')
    .select('job_text')
    .eq('id', vacancyId)
    .single();

  if (vacancyError || !vacancy) {
    throw new Error(`Failed to fetch vacancy: ${vacancyError?.message || 'Vacancy not found'}`);
  }

  const vacancyText = vacancy.job_text || '';
  if (!vacancyText.trim()) {
    throw new Error('Vacancy job_text is empty');
  }

  // Collect candidates with missing or expired llm_cache
  const candidateIds = neuralRankedCandidates.map(c => c.candidate_id);
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  // Check cache for all candidates
  const { data: cacheEntries, error: cacheError } = await supabase
    .from('match_cache')
    .select('candidate_id, llm_score, updated_at')
    .eq('vacancy_id', vacancyId)
    .in('candidate_id', candidateIds);

  const cachedMap = new Map<string, number>();
  if (!cacheError && cacheEntries) {
    for (const entry of cacheEntries) {
      const cacheAge = now - new Date(entry.updated_at).getTime();
      if (entry.llm_score !== null && cacheAge < sevenDaysInMs) {
        cachedMap.set(entry.candidate_id, entry.llm_score);
      }
    }
  }

  // Separate candidates into cached and uncached
  const candidatesNeedingLLM: CandidateBlock[] = [];
  const llmRankedCandidates: LLMPostRankedCandidate[] = [];

  // Fetch resume_text for all candidates
  const { data: candidatesData, error: candidatesError } = await supabase
    .from('candidates')
    .select('id, resume_text')
    .in('id', candidateIds);

  if (candidatesError || !candidatesData) {
    throw new Error(`Failed to fetch candidates: ${candidatesError?.message || 'Unknown error'}`);
  }

  const candidatesMap = new Map(candidatesData.map((c: any) => [c.id, c]));

  // Build initial results with cached scores
  for (const candidate of neuralRankedCandidates) {
    const cachedScore = cachedMap.get(candidate.candidate_id);
    const candidateData = candidatesMap.get(candidate.candidate_id);

    if (cachedScore !== undefined) {
      // Use cached score
      llmRankedCandidates.push({
        candidate_id: candidate.candidate_id,
        pre_score: candidate.pre_score,
        neural_rank_score: candidate.neural_rank_score,
        llm_score: cachedScore,
      });
    } else if (candidateData && candidateData.resume_text?.trim()) {
      // Need to compute LLM score
      candidatesNeedingLLM.push({
        candidate_id: candidate.candidate_id,
        resume_text: candidateData.resume_text,
      });
    }
  }

  // Process candidates in batches of 20
  if (candidatesNeedingLLM.length > 0) {
    const batchSize = 20;
    for (let i = 0; i < candidatesNeedingLLM.length; i += batchSize) {
      const batch = candidatesNeedingLLM.slice(i, i + batchSize);
      console.log(`Processing LLM batch ${Math.floor(i / batchSize) + 1} with ${batch.length} candidates...`);

      try {
        const batchResults = await batchLLMExplanations(openai, vacancyText, batch);

        // Update cache and build results
        for (const result of batchResults) {
          // Update cache
          await supabase
            .from('match_cache')
            .upsert({
              vacancy_id: vacancyId,
              candidate_id: result.candidate_id,
              llm_score: result.llm_score,
              explanation: result.explanation,
              updated_at: new Date().toISOString(),
            }, {
              onConflict: 'vacancy_id,candidate_id',
            });

          // Find corresponding neural ranked candidate
          const neuralCandidate = neuralRankedCandidates.find(
            c => c.candidate_id === result.candidate_id
          );

          if (neuralCandidate) {
            llmRankedCandidates.push({
              candidate_id: result.candidate_id,
              pre_score: neuralCandidate.pre_score,
              neural_rank_score: neuralCandidate.neural_rank_score,
              llm_score: result.llm_score,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing LLM batch:`, error);
        // Continue with next batch even if one fails
      }
    }
  }

  return llmRankedCandidates;
}

/**
 * Compute final scores by combining pre_score, neural_rank_score, and llm_score
 */
async function computeFinalScores(
  supabase: any,
  openai: OpenAI,
  vacancyId: string
): Promise<FinalScoredCandidate[]> {
  // Step 1: Get top 10 candidates from neural ranking layer
  const neuralRankedCandidates = await getTop10NeuralRankedCandidates(supabase, openai, vacancyId);

  if (neuralRankedCandidates.length === 0) {
    return [];
  }

  // Step 2: Get LLM post-ranking
  const llmPostRankedCandidates = await getLLMPostRanking(supabase, openai, vacancyId, neuralRankedCandidates);

  if (llmPostRankedCandidates.length === 0) {
    return [];
  }

  // Step 3: Compute final scores
  const finalScoredCandidates: FinalScoredCandidate[] = llmPostRankedCandidates.map((candidate) => {
    // Final fusion formula:
    // final_score = 0.20 * pre_score + 0.50 * neural_rank_score + 0.30 * llm_score
    const finalScore =
      0.20 * candidate.pre_score +
      0.50 * candidate.neural_rank_score +
      0.30 * candidate.llm_score;

    return {
      candidate_id: candidate.candidate_id,
      pre_score: candidate.pre_score,
      neural_rank_score: candidate.neural_rank_score,
      llm_score: candidate.llm_score,
      final_score: finalScore,
    };
  });

  // Sort by final_score DESC
  finalScoredCandidates.sort((a, b) => b.final_score - a.final_score);

  // Update cache with final scores
  for (const candidate of finalScoredCandidates) {
    try {
      await supabase
        .from('match_cache')
        .upsert({
          vacancy_id: vacancyId,
          candidate_id: candidate.candidate_id,
          pre_score: candidate.pre_score,
          neural_rank_score: candidate.neural_rank_score,
          llm_score: candidate.llm_score,
          final_score: candidate.final_score,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'vacancy_id,candidate_id',
        });
    } catch (error) {
      console.error(`Failed to update cache for candidate ${candidate.candidate_id}:`, error);
      // Continue even if cache update fails
    }
  }

  return finalScoredCandidates;
}

/**
 * Generate candidate explanation using LLM
 * Checks cache first (30 days validity)
 */
async function generateCandidateExplanation(
  supabase: any,
  openai: OpenAI,
  vacancyId: string,
  candidateId: string,
  vacancyText: string,
  resumeText: string
): Promise<string> {
  // Check cache first
  const { data: cacheEntry, error: cacheError } = await supabase
    .from('match_cache')
    .select('explanation, updated_at')
    .eq('vacancy_id', vacancyId)
    .eq('candidate_id', candidateId)
    .single();

  if (!cacheError && cacheEntry && cacheEntry.explanation) {
    const cacheAge = Date.now() - new Date(cacheEntry.updated_at).getTime();
    const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;

    if (cacheAge < thirtyDaysInMs) {
      console.log(`Using cached explanation for candidate ${candidateId}`);
      return cacheEntry.explanation;
    }
  }

  // Cache miss or expired - generate new explanation
  const prompt = `You are an AI recruiting assistant.
Given the job description and candidate resume, produce a short 1–2 sentence explanation of why this candidate is a good or partly good match.

Focus only on:
- functional experience
- relevant achievements
- industry match
- role seniority

Do NOT include weaknesses.
Return only plain text.

Job:

${vacancyText.trim()}

Resume:

${resumeText.trim()}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an AI recruiting assistant. Return only plain text explanation, 1-2 sentences. Do not include weaknesses.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    temperature: 0.5,
    max_tokens: 150,
  });

  const content = response.choices[0]?.message?.content?.trim();
  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  // Update cache
  await supabase
    .from('match_cache')
    .upsert({
      vacancy_id: vacancyId,
      candidate_id: candidateId,
      explanation: content,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'vacancy_id,candidate_id',
    });

  return content;
}

/**
 * Attach explanations to ranked candidates using cache
 * 
 * Explanations are already generated in getLLMPostRanking() via batchLLMExplanations(),
 * so this function retrieves them from cache.
 */
async function attachExplanations(
  supabase: any,
  vacancyId: string,
  rankedCandidates: FinalScoredCandidate[]
): Promise<CandidateMatchResult[]> {
  if (rankedCandidates.length === 0) {
    return [];
  }

  const candidateIds = rankedCandidates.map(c => c.candidate_id);

  // Fetch explanations from cache
  const { data: cacheEntries, error: cacheError } = await supabase
    .from('match_cache')
    .select('candidate_id, explanation, updated_at')
    .eq('vacancy_id', vacancyId)
    .in('candidate_id', candidateIds);

  const explanationMap = new Map<string, string>();
  const thirtyDaysInMs = 30 * 24 * 60 * 60 * 1000;
  const now = Date.now();

  if (!cacheError && cacheEntries) {
    for (const entry of cacheEntries) {
      if (entry.explanation) {
        const cacheAge = now - new Date(entry.updated_at).getTime();
        if (cacheAge < thirtyDaysInMs) {
          explanationMap.set(entry.candidate_id, entry.explanation);
        }
      }
    }
  }

  // Build results with explanations from cache
  const candidatesWithExplanations: CandidateMatchResult[] = rankedCandidates.map(candidate => {
    const explanation = explanationMap.get(candidate.candidate_id) || 'Explanation unavailable';
    return {
      ...candidate,
      explanation: explanation,
    };
  });

  return candidatesWithExplanations;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY') ?? '';

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase environment variables');
    }

    if (!openaiApiKey) {
      throw new Error('Missing OPENAI_API_KEY environment variable');
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const openai = new OpenAI({ apiKey: openaiApiKey });

    // Parse request body
    const { vacancy_id } = await req.json();

    if (!vacancy_id) {
      return new Response(
        JSON.stringify({ error: 'vacancy_id is required' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(vacancy_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid vacancy_id format. Must be a valid UUID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Run full 3-layer pipeline
    console.log(`Starting full matching pipeline for vacancy ${vacancy_id}...`);

    // Step 1: Compute final scores
    const rankedCandidates = await computeFinalScores(supabase, openai, vacancy_id);

    if (rankedCandidates.length === 0) {
      console.log(`No candidates found for vacancy ${vacancy_id}`);
      return new Response(
        JSON.stringify([]),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Step 2: Attach explanations (from cache, already generated in batch)
    console.log(`Attaching explanations for ${rankedCandidates.length} candidates...`);
    const candidatesWithExplanations = await attachExplanations(
      supabase,
      vacancy_id,
      rankedCandidates
    );

    console.log(`Matching pipeline completed. Found ${candidatesWithExplanations.length} candidates with explanations.`);

    // Return the enriched results
    return new Response(
      JSON.stringify(candidatesWithExplanations),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in /match endpoint:', error);
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
