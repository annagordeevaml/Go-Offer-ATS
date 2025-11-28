import OpenAI from 'openai';
import { supabase } from '../lib/supabaseClient';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.warn('VITE_OPENAI_API_KEY is not set. Embedding generation will fail.');
}

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
}) : null;

// Embedding model to use
const EMBEDDING_MODEL = 'text-embedding-3-large';

/**
 * Generate embedding vector for a given text using OpenAI API
 * Reusable helper function for calling the embeddings API
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Check VITE_OPENAI_API_KEY environment variable.');
  }

  if (!text || text.trim().length === 0) {
    throw new Error('Text cannot be empty for embedding generation');
  }

  try {
    const response = await openai.embeddings.create({
      model: EMBEDDING_MODEL,
      input: text.trim(),
    });

    if (!response.data || response.data.length === 0) {
      throw new Error('No embedding data returned from OpenAI API');
    }

    return response.data[0].embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Build meta text for a candidate record
 * Includes all available information about the candidate
 */
function buildCandidateMetaText(candidate: {
  general_title?: string | null;
  full_name?: string | null;
  location?: string | null;
  industry?: string | null;
  industries?: string[] | null;
  related_industries?: string[] | null;
  skills?: string[] | null;
  unified_titles?: string[] | null;
  summary?: string | null;
  company_names?: string[] | null;
  experience?: string | null;
  salary_min?: number | null;
  salary_max?: number | null;
  salary_unit?: string | null;
}): string {
  const parts: string[] = [];

  // Basic info
  if (candidate.full_name) parts.push(`Name: ${candidate.full_name}`);
  if (candidate.general_title) parts.push(`Job Title: ${candidate.general_title}`);
  if (candidate.location) parts.push(`Location: ${candidate.location}`);
  
  // Industries
  if (candidate.industries && candidate.industries.length > 0) {
    parts.push(`Industries: ${candidate.industries.join(", ")}`);
  } else if (candidate.industry) {
    parts.push(`Industry: ${candidate.industry}`);
  }
  if (candidate.related_industries && candidate.related_industries.length > 0) {
    parts.push(`Related Industries: ${candidate.related_industries.join(", ")}`);
  }
  
  // Unified titles
  if (candidate.unified_titles && candidate.unified_titles.length > 0) {
    parts.push(`Unified Job Titles: ${candidate.unified_titles.join(", ")}`);
  }
  
  // Skills
  if (candidate.skills && candidate.skills.length > 0) {
    parts.push(`Skills: ${candidate.skills.join(", ")}`);
  }
  
  // Experience
  if (candidate.experience) {
    parts.push(`Experience: ${candidate.experience}`);
  }
  
  // Companies
  if (candidate.company_names && candidate.company_names.length > 0) {
    parts.push(`Companies: ${candidate.company_names.join(", ")}`);
  }
  
  // Salary
  if (candidate.salary_min || candidate.salary_max) {
    const salaryParts: string[] = [];
    if (candidate.salary_min) salaryParts.push(`${candidate.salary_min}`);
    if (candidate.salary_max) salaryParts.push(`${candidate.salary_max}`);
    const unit = candidate.salary_unit || 'year';
    parts.push(`Salary Range: ${salaryParts.join(" - ")} ${unit}`);
  }
  
  // Summary
  if (candidate.summary) {
    parts.push(`Summary: ${candidate.summary}`);
  }

  return parts.join(". ") + ".";
}

/**
 * Build meta text for a vacancy record
 */
function buildVacancyMetaText(vacancy: {
  title: string | null;
  location: string | null;
  industry: string | null;
  skills_required: string[] | null;
}): string {
  const title = vacancy.title || '';
  const location = vacancy.location || '';
  const industry = vacancy.industry || '';
  const skills = vacancy.skills_required || [];

  return `
Title: ${title}.
Location: ${location}.
Industry: ${industry}.
Skills Required: ${skills.join(", ")}.
`;
}

/**
 * Generate embeddings for a candidate and store them in the database
 * 
 * @param candidateId - UUID of the candidate
 */
export async function generateCandidateEmbeddings(candidateId: string): Promise<void> {
  try {
    // Fetch candidate from database
    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch candidate: ${fetchError.message}`);
    }

    if (!candidate) {
      throw new Error(`Candidate with id ${candidateId} not found`);
    }

    // Load unified titles if not in main table
    let unifiedTitles: string[] = candidate.unified_titles || [];
    if (!unifiedTitles || unifiedTitles.length === 0) {
      const { data: titlesData } = await supabase
        .from('candidate_unified_titles')
        .select('unified_title')
        .eq('candidate_id', candidateId);
      unifiedTitles = titlesData?.map(t => t.unified_title) || [];
    }

    // Build meta_text with all available information about the candidate
    const metaText = buildCandidateMetaText({
      general_title: candidate.general_title || candidate.job_title,
      full_name: candidate.full_name || candidate.name,
      location: candidate.location,
      industry: candidate.industry,
      industries: candidate.industries,
      related_industries: candidate.related_industries,
      skills: candidate.skills,
      unified_titles: unifiedTitles,
      summary: candidate.summary,
      company_names: candidate.company_names,
      experience: candidate.experience,
      salary_min: candidate.salary_min,
      salary_max: candidate.salary_max,
      salary_unit: candidate.salary_unit,
    });

    // Content text includes full resume text (from resume_text column or extracted from resume_data)
    let contentText = candidate.resume_text || '';
    
    // If resume_text is empty, try to extract from resume_data HTML
    if (!contentText && candidate.resume_data?.html_content) {
      // Extract plain text from HTML
      contentText = candidate.resume_data.html_content
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    // Generate embeddings
    console.log(`Generating embeddings for candidate ${candidateId}...`);
    const [metaEmbedding, contentEmbedding] = await Promise.all([
      generateEmbedding(metaText),
      contentText ? generateEmbedding(contentText) : null,
    ]);

    // Store embeddings back to database
    // pgvector expects arrays, Supabase will handle the conversion to vector type
    const updateData: {
      meta_embedding?: number[];
      content_embedding?: number[];
    } = {};

    if (metaEmbedding) {
      updateData.meta_embedding = metaEmbedding;
    }

    if (contentEmbedding) {
      updateData.content_embedding = contentEmbedding;
    }

    const { error: updateError } = await supabase
      .from('candidates')
      .update(updateData)
      .eq('id', candidateId);

    if (updateError) {
      throw new Error(`Failed to update candidate embeddings: ${updateError.message}`);
    }

    console.log(`Successfully generated and stored embeddings for candidate ${candidateId}`);
  } catch (error) {
    console.error(`Error generating candidate embeddings for ${candidateId}:`, error);
    throw error;
  }
}

/**
 * Generate embeddings for a vacancy and store them in the database
 * 
 * @param vacancyId - UUID of the vacancy
 */
export async function generateVacancyEmbeddings(vacancyId: string): Promise<void> {
  try {
    // Fetch vacancy from database
    const { data: vacancy, error: fetchError } = await supabase
      .from('vacancies')
      .select('*')
      .eq('id', vacancyId)
      .single();

    if (fetchError) {
      throw new Error(`Failed to fetch vacancy: ${fetchError.message}`);
    }

    if (!vacancy) {
      throw new Error(`Vacancy with id ${vacancyId} not found`);
    }

    // Build meta_text and content_text
    const metaText = buildVacancyMetaText({
      title: vacancy.title,
      location: vacancy.location,
      industry: vacancy.industry,
      skills_required: vacancy.skills_required,
    });

    const contentText = vacancy.job_text || '';

    // Generate embeddings
    console.log(`Generating embeddings for vacancy ${vacancyId}...`);
    const [metaEmbedding, contentEmbedding] = await Promise.all([
      generateEmbedding(metaText),
      contentText ? generateEmbedding(contentText) : null,
    ]);

    // Store embeddings back to database
    // pgvector expects arrays, Supabase will handle the conversion to vector type
    const updateData: {
      meta_embedding?: number[];
      content_embedding?: number[];
    } = {};

    if (metaEmbedding) {
      updateData.meta_embedding = metaEmbedding;
    }

    if (contentEmbedding) {
      updateData.content_embedding = contentEmbedding;
    }

    const { error: updateError } = await supabase
      .from('vacancies')
      .update(updateData)
      .eq('id', vacancyId);

    if (updateError) {
      throw new Error(`Failed to update vacancy embeddings: ${updateError.message}`);
    }

    console.log(`Successfully generated and stored embeddings for vacancy ${vacancyId}`);
  } catch (error) {
    console.error(`Error generating vacancy embeddings for ${vacancyId}:`, error);
    throw error;
  }
}
