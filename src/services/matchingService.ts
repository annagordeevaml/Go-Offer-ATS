import { supabase } from '../lib/supabaseClient';
import OpenAI from 'openai';
import {
  calculateStringSimilarity,
  areLocationsSameContinent,
  calculateSkillMatchPercentage,
  areIndustriesRelated,
  areTitlesSimilar,
} from '../utils/stringSimilarity';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('VITE_OPENAI_API_KEY is not set. Neural ranking will fail.');
}

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
}) : null;

export interface PreScoreMatchResult {
  candidate_id: string;
  meta_similarity: number;
  content_similarity: number;
  pre_score: number;
}

export interface NeuralRankedCandidate {
  candidate_id: string;
  pre_score: number;
  neural_rank_score: number;
}

export interface LLMPostRankedCandidate {
  candidate_id: string;
  pre_score: number;
  neural_rank_score: number;
  llm_score: number;
}

export interface FinalScoredCandidate {
  candidate_id: string;
  pre_score: number;
  neural_rank_score: number;
  llm_score: number;
  final_score: number;
}

export interface CandidateMatchResult {
  candidate_id: string;
  pre_score: number;
  neural_rank_score: number;
  llm_score: number;
  final_score: number;
  explanation?: string;
}

export interface FilteredCandidate {
  candidate_id: string;
  soft_penalty: number; // 0 or 0.15
}

/**
 * Filter candidates before matching using hard and soft filters
 * 
 * Hard filters (exclude):
 * - Missing any must-have skill
 * - Industry mismatch (exact)
 * - General title not in allowed list
 * - Location mismatch for non-remote roles (similarity < 0.3)
 * - Empty resume_text
 * 
 * Soft filters (add penalty):
 * - Industry subtype mismatch
 * - Title partial mismatch
 * - Partial skill match (60-80%)
 * - Location partial mismatch (same continent, different timezone)
 * 
 * @param vacancyId - UUID of the vacancy
 * @returns Array of filtered candidate IDs with soft_penalty values
 */
export async function filterCandidatesBeforeMatching(vacancyId: string): Promise<FilteredCandidate[]> {
  try {
    // Load vacancy info
    const { data: vacancy, error: vacancyError } = await supabase
      .from('vacancies')
      .select('title, location, industry, skills_required')
      .eq('id', vacancyId)
      .single();

    if (vacancyError || !vacancy) {
      throw new Error(`Failed to fetch vacancy: ${vacancyError?.message || 'Vacancy not found'}`);
    }

    const vacancyTitle = (vacancy.title || '').toLowerCase();
    const vacancyLocation = vacancy.location || '';
    const vacancyIndustry = vacancy.industry || '';
    const vacancySkills = vacancy.skills_required || [];
    const isRemote = vacancyLocation.toLowerCase().includes('remote');

    // Load all candidates
    const { data: candidates, error: candidatesError } = await supabase
      .from('candidates')
      .select('id, general_title, location, industry, skills, resume_text');

    if (candidatesError) {
      throw new Error(`Failed to fetch candidates: ${candidatesError.message}`);
    }

    if (!candidates || candidates.length === 0) {
      return [];
    }

    const filteredCandidates: FilteredCandidate[] = [];

    for (const candidate of candidates) {
      let softPenalty = 0;

      // HARD FILTER 1: Missing any must-have skill
      if (vacancySkills.length > 0) {
        const candidateSkills = candidate.skills || [];
        const skillMatch = calculateSkillMatchPercentage(vacancySkills, candidateSkills);
        if (skillMatch < 1.0) {
          // Check if it's a partial match (soft filter) or complete miss (hard filter)
          if (skillMatch < 0.6) {
            continue; // Hard filter: exclude
          }
          // Soft filter: partial match (60-80%)
          if (skillMatch >= 0.6 && skillMatch < 0.8) {
            softPenalty = 0.15;
          }
        }
      }

      // HARD FILTER 2: Industry mismatch (exact)
      const candidateIndustry = candidate.industry || '';
      if (vacancyIndustry && candidateIndustry) {
        if (candidateIndustry.toLowerCase() !== vacancyIndustry.toLowerCase()) {
          // Check if it's a related industry (soft filter)
          if (areIndustriesRelated(candidateIndustry, vacancyIndustry)) {
            softPenalty = 0.15;
          } else {
            continue; // Hard filter: exclude
          }
        }
      }

      // HARD FILTER 3: General title not in allowed list
      const candidateTitle = (candidate.general_title || '').toLowerCase();
      if (vacancyTitle && candidateTitle) {
        if (candidateTitle !== vacancyTitle.toLowerCase()) {
          // Check if titles are similar (soft filter)
          if (areTitlesSimilar(candidateTitle, vacancyTitle)) {
            softPenalty = 0.15;
          } else {
            continue; // Hard filter: exclude
          }
        }
      }

      // HARD FILTER 4: Location mismatch for non-remote roles
      if (!isRemote && vacancyLocation && candidate.location) {
        const locationSimilarity = calculateStringSimilarity(vacancyLocation, candidate.location);
        if (locationSimilarity < 0.3) {
          // Check if same continent (soft filter)
          if (areLocationsSameContinent(vacancyLocation, candidate.location)) {
            softPenalty = 0.15;
          } else {
            continue; // Hard filter: exclude
          }
        }
      }

      // HARD FILTER 5: Empty resume_text
      if (!candidate.resume_text || candidate.resume_text.trim().length === 0) {
        continue; // Hard filter: exclude
      }

      // Candidate passed all filters
      filteredCandidates.push({
        candidate_id: candidate.id,
        soft_penalty: softPenalty,
      });
    }

    return filteredCandidates;
  } catch (error) {
    console.error(`Error filtering candidates for vacancy ${vacancyId}:`, error);
    throw error;
  }
}

/**
 * Get top 50 candidates by pre-score for a given vacancy
 * 
 * This function:
 * 1. Filters candidates using hard/soft filters
 * 2. Calls the SQL function match_candidates_pre_score
 * 3. Applies soft penalties to pre_score
 * 
 * Returns the top 50 candidates sorted by pre_score DESC
 * 
 * @param vacancyId - UUID of the vacancy
 * @returns Array of top 50 candidates with their pre-score metrics (with soft penalties applied)
 */
export async function getTop50CandidatesByPreScore(vacancyId: string): Promise<PreScoreMatchResult[]> {
  try {
    // Step 1: Filter candidates before matching
    const filteredCandidates = await filterCandidatesBeforeMatching(vacancyId);
    const allowedCandidateIds = filteredCandidates.map(fc => fc.candidate_id);
    const softPenaltyMap = new Map<string, number>(
      filteredCandidates.map(fc => [fc.candidate_id, fc.soft_penalty])
    );

    if (allowedCandidateIds.length === 0) {
      return [];
    }

    // Step 2: Get pre-score matches (SQL function returns all candidates, we'll filter in memory)
    const { data, error } = await supabase.rpc('match_candidates_pre_score', {
      vacancy_uuid: vacancyId,
    });

    if (error) {
      throw new Error(`Failed to get pre-score matches: ${error.message}`);
    }

    if (!data) {
      return [];
    }

    // Step 3: Filter to only allowed candidates and apply soft penalties
    const results: PreScoreMatchResult[] = [];
    const allowedSet = new Set(allowedCandidateIds);

    for (const result of data as PreScoreMatchResult[]) {
      if (allowedSet.has(result.candidate_id)) {
        const softPenalty = softPenaltyMap.get(result.candidate_id) || 0;
        // Apply soft penalty: pre_score = pre_score * (1 - soft_penalty)
        const adjustedPreScore = result.pre_score * (1 - softPenalty);

        results.push({
          ...result,
          pre_score: adjustedPreScore,
        });
      }
    }

    // Step 4: Sort by adjusted pre_score DESC and return top 50
    results.sort((a, b) => b.pre_score - a.pre_score);
    return results.slice(0, 50);
  } catch (error) {
    console.error(`Error getting top 50 candidates by pre-score for vacancy ${vacancyId}:`, error);
    throw error;
  }
}

/**
 * Get neural rank score by comparing job text and resume text using OpenAI
 * 
 * This function implements a cross-encoder behavior by directly comparing
 * the job description and candidate resume using GPT-4o-mini.
 * 
 * Checks cache first: if neural_rank_score exists and is < 7 days old, returns cached value.
 * Otherwise computes new value and updates cache.
 * 
 * @param vacancyId - UUID of the vacancy
 * @param candidateId - UUID of the candidate
 * @param vacancyText - Full job description text
 * @param resumeText - Full candidate resume text
 * @returns Numeric score between 0 and 1 representing functional similarity
 */
export async function getNeuralRankScore(
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
  if (!openai) {
    throw new Error('OpenAI client not initialized. Check VITE_OPENAI_API_KEY environment variable.');
  }

  if (!vacancyText || !vacancyText.trim()) {
    throw new Error('Vacancy text cannot be empty');
  }

  if (!resumeText || !resumeText.trim()) {
    throw new Error('Resume text cannot be empty');
  }

  const prompt = `You are a semantic ranking model.
Compare the following job description and candidate resume.
Return a single float number between 0 and 1 based on functional similarity.

Job:

${vacancyText.trim()}

Resume:

${resumeText.trim()}

Return ONLY the number.`;

  try {
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

    // Ensure score is between 0 and 1
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
  } catch (error) {
    console.error('Error generating neural rank score:', error);
    throw new Error(`Failed to generate neural rank score: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get top 10 candidates ranked by neural rank score
 * 
 * This function:
 * 1. Gets top 50 candidates from pre-score layer
 * 2. For each candidate, computes neural_rank_score using GPT-4o-mini
 * 3. Sorts candidates by neural_rank_score DESC
 * 4. Returns top 10 candidates
 * 
 * @param vacancyId - UUID of the vacancy
 * @returns Array of top 10 candidates with pre_score and neural_rank_score
 */
export async function getTop10NeuralRankedCandidates(vacancyId: string): Promise<NeuralRankedCandidate[]> {
  try {
    // Step 1: Get top 50 candidates from pre-score layer
    const preScoreResults = await getTop50CandidatesByPreScore(vacancyId);

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

    // Step 3: Fetch candidate resume_text and compute neural rank scores
    const neuralRankedCandidates: NeuralRankedCandidate[] = [];

    for (const preScoreResult of preScoreResults) {
      try {
        const { data: candidate, error: candidateError } = await supabase
          .from('candidates')
          .select('resume_text')
          .eq('id', preScoreResult.candidate_id)
          .single();

        if (candidateError || !candidate) {
          console.warn(`Failed to fetch candidate ${preScoreResult.candidate_id}: ${candidateError?.message}`);
          continue;
        }

        const resumeText = candidate.resume_text || '';
        if (!resumeText.trim()) {
          console.warn(`Candidate ${preScoreResult.candidate_id} has empty resume_text`);
          continue;
        }

        // Compute neural rank score
        const neuralRankScore = await getNeuralRankScore(vacancyId, preScoreResult.candidate_id, vacancyText, resumeText);

        neuralRankedCandidates.push({
          candidate_id: preScoreResult.candidate_id,
          pre_score: preScoreResult.pre_score,
          neural_rank_score: neuralRankScore,
        });
      } catch (error) {
        console.error(`Error processing candidate ${preScoreResult.candidate_id} for neural ranking:`, error);
        // Continue with next candidate
        continue;
      }
    }

    // Step 4: Sort by neural_rank_score DESC and return top 10
    neuralRankedCandidates.sort((a, b) => b.neural_rank_score - a.neural_rank_score);
    
    return neuralRankedCandidates.slice(0, 10);
  } catch (error) {
    console.error(`Error getting top 10 neural ranked candidates for vacancy ${vacancyId}:`, error);
    throw error;
  }
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

/**
 * Batch LLM calls for explanations and llm_score
 * 
 * Sends 1 vacancy description + up to 20 candidates in ONE request to OpenAI.
 * Returns both llm_score and explanation for each candidate.
 * 
 * @param vacancyText - Full job description text
 * @param candidateBlocks - Array of candidate blocks (max 20 per batch)
 * @returns Array of results with llm_score and explanation for each candidate
 */
export async function batchLLMExplanations(
  vacancyText: string,
  candidateBlocks: CandidateBlock[]
): Promise<BatchLLMResult[]> {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Check VITE_OPENAI_API_KEY environment variable.');
  }

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

  try {
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
  } catch (error) {
    console.error('Error in batch LLM explanations:', error);
    throw new Error(`Failed to generate batch LLM results: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get LLM post-rank score by evaluating job and resume match using OpenAI
 * 
 * This function uses deeper reasoning to evaluate the match between
 * a job description and candidate resume, considering multiple factors.
 * 
 * Checks cache first: if llm_score exists and is < 7 days old, returns cached value.
 * Otherwise computes new value and updates cache.
 * 
 * NOTE: This function is kept for backward compatibility, but batch processing is preferred.
 * 
 * @param vacancyId - UUID of the vacancy
 * @param candidateId - UUID of the candidate
 * @param vacancyText - Full job description text
 * @param resumeText - Full candidate resume text
 * @returns Numeric score between 0 and 1 representing overall match quality
 */
export async function getLLMPostRankScore(
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
  if (!openai) {
    throw new Error('OpenAI client not initialized. Check VITE_OPENAI_API_KEY environment variable.');
  }

  if (!vacancyText || !vacancyText.trim()) {
    throw new Error('Vacancy text cannot be empty');
  }

  if (!resumeText || !resumeText.trim()) {
    throw new Error('Resume text cannot be empty');
  }

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

  try {
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

    // Ensure score is between 0 and 1
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
  } catch (error) {
    console.error('Error generating LLM post-rank score:', error);
    throw new Error(`Failed to generate LLM post-rank score: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get LLM post-ranking for top 10 candidates using batch processing
 * 
 * This function:
 * 1. Gets top 10 candidates from neural ranking layer
 * 2. Collects candidates with missing llm_cache
 * 3. Processes them in batches of 20 using batchLLMExplanations()
 * 4. Saves results into match_cache
 * 5. Returns candidates with pre_score, neural_rank_score, and llm_score
 * 
 * @param vacancyId - UUID of the vacancy
 * @returns Array of candidates with all three scores
 */
export async function getLLMPostRanking(vacancyId: string): Promise<LLMPostRankedCandidate[]> {
  try {
    // Step 1: Get top 10 candidates from neural ranking layer
    const neuralRankedCandidates = await getTop10NeuralRankedCandidates(vacancyId);

    if (neuralRankedCandidates.length === 0) {
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

    // Step 3: Collect candidates with missing or expired llm_cache
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

    const candidatesMap = new Map(candidatesData.map(c => [c.id, c]));

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

    // Step 4: Process candidates in batches of 20
    if (candidatesNeedingLLM.length > 0) {
      const batchSize = 20;
      for (let i = 0; i < candidatesNeedingLLM.length; i += batchSize) {
        const batch = candidatesNeedingLLM.slice(i, i + batchSize);
        console.log(`Processing LLM batch ${Math.floor(i / batchSize) + 1} with ${batch.length} candidates...`);

        try {
          const batchResults = await batchLLMExplanations(vacancyText, batch);

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
  } catch (error) {
    console.error(`Error getting LLM post-ranking for vacancy ${vacancyId}:`, error);
    throw error;
  }
}

/**
 * Compute final scores by combining pre_score, neural_rank_score, and llm_score
 * 
 * This function:
 * 1. Gets candidates with all three scores from LLM post-ranking layer
 * 2. For each candidate, calculates final_score using the fusion formula:
 *    final_score = 0.20 * pre_score + 0.50 * neural_rank_score + 0.30 * llm_score
 * 3. Returns candidates sorted by final_score DESC
 * 
 * @param vacancyId - UUID of the vacancy
 * @returns Array of candidates with all scores including final_score, sorted by final_score DESC
 */
export async function computeFinalScores(vacancyId: string): Promise<FinalScoredCandidate[]> {
  try {
    // Get candidates with pre_score, neural_rank_score, and llm_score
    const llmPostRankedCandidates = await getLLMPostRanking(vacancyId);

    if (llmPostRankedCandidates.length === 0) {
      return [];
    }

    // Calculate final_score for each candidate
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
  } catch (error) {
    console.error(`Error computing final scores for vacancy ${vacancyId}:`, error);
    throw error;
  }
}

/**
 * Generate candidate explanation using LLM
 * 
 * This function generates a short 1-2 sentence explanation describing
 * why the candidate matches the vacancy.
 * 
 * Checks cache first: if explanation exists and is < 30 days old, returns cached value.
 * Otherwise generates new explanation and updates cache.
 * 
 * @param vacancyId - UUID of the vacancy
 * @param candidateId - UUID of the candidate
 * @param vacancyText - Full job description text
 * @param resumeText - Full candidate resume text
 * @returns 1-2 sentence explanation as plain text
 */
export async function generateCandidateExplanation(
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
  if (!openai) {
    throw new Error('OpenAI client not initialized. Check VITE_OPENAI_API_KEY environment variable.');
  }

  if (!vacancyText || !vacancyText.trim()) {
    throw new Error('Vacancy text cannot be empty');
  }

  if (!resumeText || !resumeText.trim()) {
    throw new Error('Resume text cannot be empty');
  }

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

  try {
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
  } catch (error) {
    console.error('Error generating candidate explanation:', error);
    throw new Error(`Failed to generate candidate explanation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Attach explanations to ranked candidates using batch processing
 * 
 * Explanations are already generated in getLLMPostRanking() via batchLLMExplanations(),
 * so this function mainly retrieves them from cache.
 * 
 * @param vacancyId - UUID of the vacancy
 * @param rankedCandidates - Array of candidates with scores
 * @returns Array of candidates with explanations added
 */
export async function attachExplanations(
  vacancyId: string,
  rankedCandidates: FinalScoredCandidate[]
): Promise<CandidateMatchResult[]> {
  try {
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
    // Explanations should already be in cache from batchLLMExplanations() in getLLMPostRanking()
    const candidatesWithExplanations: CandidateMatchResult[] = rankedCandidates.map(candidate => {
      const explanation = explanationMap.get(candidate.candidate_id) || 'Explanation unavailable';
      return {
        ...candidate,
        explanation: explanation,
      };
    });

    return candidatesWithExplanations;
  } catch (error) {
    console.error(`Error attaching explanations for vacancy ${vacancyId}:`, error);
    throw error;
  }
}
