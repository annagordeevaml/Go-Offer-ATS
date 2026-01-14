import { supabase } from '../lib/supabaseClient';
import { normalizeJobSkills } from '../services/skillsNormalization';

/**
 * Update skills for all existing jobs in the database
 * Extracts skills from job descriptions and normalizes them
 */
export async function updateAllJobSkills(): Promise<void> {
  try {
    console.log('Starting batch skills update for all jobs...');

    // Fetch all jobs with descriptions
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title, description')
      .not('description', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('No jobs with descriptions found in database');
      return;
    }

    // Filter jobs that have non-empty descriptions
    const jobsWithDescription = jobs.filter(j => {
      return j.description && j.description.trim().length > 0;
    });

    if (jobsWithDescription.length === 0) {
      console.log('No jobs with job description content found in database');
      return;
    }

    console.log(`Found ${jobsWithDescription.length} jobs with descriptions. Starting skills extraction...`);

    // Process jobs one by one (sequentially to avoid rate limits)
    let processed = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < jobsWithDescription.length; i++) {
      const job = jobsWithDescription[i];
      
      console.log(`\n[${i + 1}/${jobsWithDescription.length}] Processing job ${job.id} (${job.title})...`);

      try {
        const jobDescription = job.description || '';
        
        if (!jobDescription || jobDescription.trim().length === 0) {
          console.warn(`  ⚠ Empty job description for job ${job.id}`);
          skipped++;
          continue;
        }

        console.log(`  → Job description length: ${jobDescription.length} characters`);

        // Extract and normalize skills from job description using ChatGPT
        console.log(`  → Sending job description to ChatGPT for skills extraction...`);
        const normalizedSkills = await normalizeJobSkills(job.id, jobDescription);
        
        if (!normalizedSkills || normalizedSkills.length === 0) {
          console.warn(`  ⚠ No skills extracted for job ${job.id}`);
          skipped++;
          continue;
        }

        console.log(`  ✓ Extracted ${normalizedSkills.length} skills:`, normalizedSkills.slice(0, 10).join(', '), normalizedSkills.length > 10 ? '...' : '');

        // Update job in database - save to hard_skills column
        console.log(`  → Saving to hard_skills column in database...`);
        const { error: updateError } = await supabase
          .from('jobs')
          .update({ hard_skills: normalizedSkills })
          .eq('id', job.id);

        if (updateError) {
          console.error(`  ✗ Failed to update job ${job.id}:`, updateError);
          console.error(`  → Error details:`, updateError.message, updateError.details, updateError.hint);
          errors++;
        } else {
          processed++;
          console.log(`  ✓ Successfully updated job ${job.id} with ${normalizedSkills.length} skills`);
        }
      } catch (error) {
        errors++;
        console.error(`  ✗ Error processing job ${job.id}:`, error);
        if (error instanceof Error) {
          console.error(`  → Error message:`, error.message);
          console.error(`  → Error stack:`, error.stack);
        }
      }

      // Delay between jobs to avoid rate limits (3 second delay)
      if (i < jobsWithDescription.length - 1) {
        console.log(`  → Waiting 3 seconds before next job...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay between jobs
      }
    }

    console.log(`\n✅ Skills update complete!`);
    console.log(`   Processed: ${processed}/${jobsWithDescription.length}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
  } catch (error) {
    console.error('Error updating skills for all jobs:', error);
    throw error;
  }
}


