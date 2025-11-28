import { supabase } from '../lib/supabaseClient';
import { Job } from '../types';
import { generateVacancyEmbeddings } from './embeddingsService';

/**
 * Create or get a vacancy from a job
 * If vacancy doesn't exist, create it and generate embeddings
 */
export async function ensureVacancyFromJob(job: Job): Promise<string> {
  // Check if vacancy already exists for this job
  // We'll use a mapping table or check by title + location
  // For now, let's create a new vacancy each time or use a job_id mapping
  
  // First, try to find existing vacancy by matching title and location
  const { data: existingVacancies, error: searchError } = await supabase
    .from('vacancies')
    .select('id')
    .eq('title', job.title)
    .eq('location', job.location || '');

  // If search returns results, use the first one
  if (!searchError && existingVacancies && existingVacancies.length > 0) {
    return existingVacancies[0].id;
  }

  // If there was an error (like table doesn't exist), we'll try to create it anyway
  // The error will be caught below

  // Create new vacancy from job
  const vacancyData = {
    title: job.title,
    location: job.location || '',
    industry: Array.isArray(job.industry) ? job.industry.join(', ') : (job.industry || ''),
    skills_required: job.skills || [],
    job_text: job.description || job.title, // Use description if available, otherwise title
  };

  const { data: newVacancy, error: createError } = await supabase
    .from('vacancies')
    .insert([vacancyData])
    .select('id')
    .single();

  if (createError || !newVacancy) {
    throw new Error(`Failed to create vacancy: ${createError?.message || 'Unknown error'}`);
  }

  // Generate embeddings for the new vacancy
  try {
    await generateVacancyEmbeddings(newVacancy.id);
  } catch (embeddingError) {
    console.error('Error generating embeddings for vacancy:', embeddingError);
    // Continue even if embeddings fail - they can be generated later
  }

  return newVacancy.id;
}

