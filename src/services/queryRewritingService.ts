import OpenAI from 'openai';
import { supabase } from '../lib/supabaseClient';
import { generateEmbedding } from './embeddingsService';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('VITE_OPENAI_API_KEY is not set. Query rewriting will fail.');
}

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
}) : null;

export interface ExpandedJobQuery {
  primary_title: string;
  alternate_titles: string[];
  core_responsibilities: string[];
  skill_groups: string[];
  industry: string;
  expanded_keywords: string[];
}

/**
 * Rewrite job description into expanded semantic query using LLM
 * 
 * Expands job description to improve recall and matching quality by:
 * - Normalizing title
 * - Finding alternative titles
 * - Extracting core responsibilities
 * - Grouping required skills
 * - Identifying industry category
 * - Generating expanded keywords
 * 
 * @param jobDescription - Full job description text
 * @returns Expanded job query with structured information
 */
export async function rewriteJobQuery(jobDescription: string): Promise<ExpandedJobQuery> {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Check VITE_OPENAI_API_KEY environment variable.');
  }

  if (!jobDescription || !jobDescription.trim()) {
    throw new Error('Job description cannot be empty');
  }

  const prompt = `You are a job query expansion system. Analyze the following job description and extract structured information to improve candidate matching.

Job Description:

${jobDescription.trim()}

Extract and return JSON with this exact structure:
{
  "primary_title": "Normalized job title (e.g., 'Software Engineer', 'Marketing Manager')",
  "alternate_titles": ["Alternative titles that mean the same role", "e.g., 'Developer', 'Programmer'"],
  "core_responsibilities": [
    "Main responsibility 1 in one sentence",
    "Main responsibility 2 in one sentence",
    "Main responsibility 3 in one sentence",
    "Main responsibility 4 in one sentence",
    "Main responsibility 5 in one sentence"
  ],
  "skill_groups": [
    "Group 1: List of related technical skills",
    "Group 2: List of related soft skills or tools",
    "Group 3: List of domain-specific skills"
  ],
  "industry": "Industry category (e.g., 'Software / SaaS', 'FinTech', 'EdTech')",
  "expanded_keywords": ["keyword1", "keyword2", "keyword3", "keyword4", "keyword5", "keyword6", "keyword7", "keyword8", "keyword9", "keyword10"]
}

Rules:
- primary_title: Use standard job title format
- alternate_titles: Include 3-5 alternative titles that candidates might use
- core_responsibilities: Exactly 5 bullet points, each one sentence
- skill_groups: Exactly 3 groups, each containing related skills
- industry: Use standardized industry name
- expanded_keywords: 10-15 keywords that capture the essence of the role

Return ONLY valid JSON, no additional text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a job query expansion system. Return only valid JSON with the exact structure specified.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1500,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content?.trim();
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    // Parse JSON response
    let expandedQuery: ExpandedJobQuery;
    try {
      expandedQuery = JSON.parse(content);
    } catch (parseError) {
      // Try to extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        expandedQuery = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error(`Failed to parse JSON response: ${parseError}`);
      }
    }

    // Validate required fields
    if (!expandedQuery.primary_title || !expandedQuery.industry) {
      throw new Error('Invalid response: missing required fields');
    }

    // Ensure arrays exist
    expandedQuery.alternate_titles = expandedQuery.alternate_titles || [];
    expandedQuery.core_responsibilities = expandedQuery.core_responsibilities || [];
    expandedQuery.skill_groups = expandedQuery.skill_groups || [];
    expandedQuery.expanded_keywords = expandedQuery.expanded_keywords || [];

    return expandedQuery;
  } catch (error) {
    console.error('Error rewriting job query:', error);
    throw new Error(`Failed to rewrite job query: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Fallback query expansion using synonym dictionary
 * Used when GPT is unavailable
 */
export function expandJobQueryFallback(jobDescription: string): ExpandedJobQuery {
  // Simple keyword extraction and synonym expansion
  const titleSynonyms: Record<string, string[]> = {
    'engineer': ['developer', 'programmer', 'coder'],
    'manager': ['lead', 'director', 'head'],
    'designer': ['design', 'creative'],
    'analyst': ['analytics', 'data analyst'],
  };

  const industrySynonyms: Record<string, string[]> = {
    'software': ['saas', 'tech', 'technology'],
    'fintech': ['financial technology', 'payments', 'banking tech'],
    'edtech': ['education technology', 'learning platform', 'e-learning'],
  };

  // Extract basic information (simplified)
  const normalized = jobDescription.toLowerCase();
  let primaryTitle = 'Other';
  const alternateTitles: string[] = [];
  const expandedKeywords: string[] = [];

  // Simple title detection
  if (normalized.includes('engineer') || normalized.includes('developer')) {
    primaryTitle = 'Software Engineer';
    alternateTitles.push('Developer', 'Programmer');
  } else if (normalized.includes('manager')) {
    primaryTitle = 'Manager';
    alternateTitles.push('Lead', 'Director');
  }

  // Extract keywords (simple word frequency)
  const words = normalized.split(/\s+/).filter(w => w.length > 4);
  expandedKeywords.push(...words.slice(0, 10));

  return {
    primary_title: primaryTitle,
    alternate_titles: alternateTitles,
    core_responsibilities: [
      'Responsibility extracted from job description',
      'Key function of the role',
      'Main area of focus',
      'Primary duty',
      'Core responsibility',
    ],
    skill_groups: [
      'Technical skills mentioned',
      'Tools and technologies',
      'Domain expertise',
    ],
    industry: 'Other',
    expanded_keywords: expandedKeywords,
  };
}

/**
 * Save expanded query to database and generate enhanced embedding
 */
export async function saveExpandedQuery(jobId: string, expandedQuery: ExpandedJobQuery): Promise<void> {
  try {
    // Generate enhanced embedding from expanded query
    const enhancedText = [
      expandedQuery.primary_title,
      ...expandedQuery.alternate_titles,
      ...expandedQuery.core_responsibilities,
      expandedQuery.industry,
      ...expandedQuery.expanded_keywords,
    ].join(' ');

    const enhancedEmbedding = await generateEmbedding(enhancedText);

    // Save to database
    const { error } = await supabase
      .from('job_query_expanded')
      .upsert({
        job_id: jobId,
        primary_title: expandedQuery.primary_title,
        alternate_titles: expandedQuery.alternate_titles,
        core_responsibilities: expandedQuery.core_responsibilities,
        skill_groups: expandedQuery.skill_groups,
        industry: expandedQuery.industry,
        expanded_keywords: expandedQuery.expanded_keywords,
        job_vector_enhanced: enhancedEmbedding,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'job_id',
      });

    if (error) {
      throw new Error(`Failed to save expanded query: ${error.message}`);
    }

    console.log(`Successfully saved expanded query for job ${jobId}`);
  } catch (error) {
    console.error(`Error saving expanded query for job ${jobId}:`, error);
    throw error;
  }
}

/**
 * Get expanded query from cache or generate new one
 */
export async function getOrExpandJobQuery(jobId: string, jobDescription: string): Promise<ExpandedJobQuery> {
  try {
    // Check cache first
    const { data: cached, error: cacheError } = await supabase
      .from('job_query_expanded')
      .select('*')
      .eq('job_id', jobId)
      .single();

    if (!cacheError && cached) {
      // Return cached version
      return {
        primary_title: cached.primary_title || '',
        alternate_titles: cached.alternate_titles || [],
        core_responsibilities: cached.core_responsibilities || [],
        skill_groups: cached.skill_groups || [],
        industry: cached.industry || '',
        expanded_keywords: cached.expanded_keywords || [],
      };
    }

    // Generate new expanded query
    let expandedQuery: ExpandedJobQuery;
    try {
      expandedQuery = await rewriteJobQuery(jobDescription);
    } catch (error) {
      console.warn('LLM query rewriting failed, using fallback:', error);
      expandedQuery = expandJobQueryFallback(jobDescription);
    }

    // Save to cache
    await saveExpandedQuery(jobId, expandedQuery);

    return expandedQuery;
  } catch (error) {
    console.error(`Error getting/expanding job query for ${jobId}:`, error);
    throw error;
  }
}


