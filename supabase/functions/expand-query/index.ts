import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from 'https://deno.land/x/openai@v4.20.1/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ExpandedJobQuery {
  primary_title: string;
  alternate_titles: string[];
  core_responsibilities: string[];
  skill_groups: string[];
  industry: string;
  expanded_keywords: string[];
}

/**
 * Rewrite job description into expanded semantic query using LLM
 */
async function rewriteJobQuery(
  openai: OpenAI,
  jobDescription: string
): Promise<ExpandedJobQuery> {
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

  let expandedQuery: ExpandedJobQuery;
  try {
    expandedQuery = JSON.parse(content);
  } catch (parseError) {
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
    if (jsonMatch) {
      expandedQuery = JSON.parse(jsonMatch[1]);
    } else {
      throw new Error(`Failed to parse JSON response: ${parseError}`);
    }
  }

  if (!expandedQuery.primary_title || !expandedQuery.industry) {
    throw new Error('Invalid response: missing required fields');
  }

  expandedQuery.alternate_titles = expandedQuery.alternate_titles || [];
  expandedQuery.core_responsibilities = expandedQuery.core_responsibilities || [];
  expandedQuery.skill_groups = expandedQuery.skill_groups || [];
  expandedQuery.expanded_keywords = expandedQuery.expanded_keywords || [];

  return expandedQuery;
}

/**
 * Generate embedding for enhanced query
 */
async function generateEnhancedEmbedding(
  openai: OpenAI,
  expandedQuery: ExpandedJobQuery
): Promise<number[]> {
  const enhancedText = [
    expandedQuery.primary_title,
    ...expandedQuery.alternate_titles,
    ...expandedQuery.core_responsibilities,
    expandedQuery.industry,
    ...expandedQuery.expanded_keywords,
  ].join(' ');

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: enhancedText.trim(),
  });

  if (!response.data || response.data.length === 0) {
    throw new Error('No embedding data returned from OpenAI API');
  }

  return response.data[0].embedding;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize clients
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

    // Extract job ID from URL path
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/');
    const jobId = pathParts[pathParts.length - 1];

    if (!jobId || jobId === 'expand-query') {
      return new Response(
        JSON.stringify({ error: 'Job ID is required in URL path: /expand-query/{job_id}' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(jobId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid job ID format. Must be a valid UUID' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch job description
    const { data: vacancy, error: vacancyError } = await supabase
      .from('vacancies')
      .select('job_text, title')
      .eq('id', jobId)
      .single();

    if (vacancyError || !vacancy) {
      return new Response(
        JSON.stringify({ error: `Vacancy not found: ${vacancyError?.message || 'Not found'}` }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const jobDescription = vacancy.job_text || '';
    if (!jobDescription.trim()) {
      return new Response(
        JSON.stringify({ error: 'Job description is empty' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Rewrite job query
    console.log(`Expanding query for job ${jobId}...`);
    const expandedQuery = await rewriteJobQuery(openai, jobDescription);

    // Generate enhanced embedding
    const enhancedEmbedding = await generateEnhancedEmbedding(openai, expandedQuery);

    // Save to database
    const { error: saveError } = await supabase
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

    if (saveError) {
      throw new Error(`Failed to save expanded query: ${saveError.message}`);
    }

    console.log(`Successfully expanded and saved query for job ${jobId}`);

    // Return the expanded query
    return new Response(
      JSON.stringify({
        job_id: jobId,
        ...expandedQuery,
        message: 'Query expanded and saved successfully',
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in /expand-query endpoint:', error);
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


