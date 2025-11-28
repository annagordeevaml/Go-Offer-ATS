import { supabase } from '../lib/supabaseClient';
import { normalizeJobTitle, generateJobTitleEmbedding } from '../services/jobTitleNormalization';

/**
 * Normalize job titles and generate embeddings for all existing jobs in the database
 * This function processes jobs in batches to avoid overwhelming the API
 */
export async function normalizeAllJobTitlesForJobs(): Promise<void> {
  try {
    console.log('Starting batch job title normalization for all jobs...');

    // Fetch all jobs with titles
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title, normalized_title')
      .not('title', 'is', null)
      .neq('title', '')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('No jobs with titles found in database');
      return;
    }

    console.log(`Found ${jobs.length} jobs with titles. Starting normalization...`);

    // Filter out jobs that already have normalized_title
    const jobsToProcess = jobs.filter(j => !j.normalized_title);
    console.log(`${jobsToProcess.length} jobs need normalization (${jobs.length - jobsToProcess.length} already normalized)`);

    if (jobsToProcess.length === 0) {
      console.log('All jobs already have normalized titles!');
      return;
    }

    // Process jobs in batches of 5 to avoid rate limiting
    const batchSize = 5;
    let processed = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < jobsToProcess.length; i += batchSize) {
      const batch = jobsToProcess.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (jobs ${i + 1}-${Math.min(i + batchSize, jobsToProcess.length)})...`);

      // Process batch in parallel
      await Promise.all(
        batch.map(async (job) => {
          try {
            const jobTitle = job.title;
            if (!jobTitle || jobTitle.trim().length === 0) {
              skipped++;
              return;
            }

            // Normalize job title (already returns lowercase)
            const normalizedTitle = await normalizeJobTitle(jobTitle);
            console.log(`  ✓ Normalized: "${jobTitle}" → "${normalizedTitle}"`);

            // Generate embedding
            const embedding = await generateJobTitleEmbedding(normalizedTitle);
            
            if (!embedding || embedding.length === 0) {
              console.warn(`  ⚠ Failed to generate embedding for job ${job.id}`);
              errors++;
              return;
            }

            // Update job in database
            const updateData: any = {
              normalized_title: normalizedTitle,
            };
            
            // Add embedding if available (Supabase expects array for vector type)
            if (embedding && embedding.length > 0) {
              updateData.title_embedding = embedding;
            }
            
            console.log(`  📝 Updating job ${job.id}...`);
            
            const { data: updateResult, error: updateError } = await supabase
              .from('jobs')
              .update(updateData)
              .eq('id', job.id)
              .select('id, normalized_title');

            if (updateError) {
              console.error(`  ✗ Failed to update job ${job.id}:`, updateError);
              console.error(`  Error details:`, JSON.stringify(updateError, null, 2));
              
              // Check if error is about missing columns
              if (updateError.message && (
                updateError.message.includes('normalized_title') ||
                updateError.message.includes('title_embedding') ||
                updateError.message.includes('column') ||
                updateError.message.includes('does not exist')
              )) {
                console.error(`  ⚠ Database schema issue: The columns 'normalized_title' and/or 'title_embedding' may not exist.`);
                console.error(`  Please run the SQL script 'add_normalized_title_to_jobs.sql' in Supabase Dashboard.`);
              }
              
              errors++;
            } else {
              // Verify the update was successful
              if (updateResult && updateResult.length > 0) {
                const updated = updateResult[0];
                if (updated.normalized_title === normalizedTitle) {
                  processed++;
                  console.log(`  ✓ Successfully updated job ${job.id} (${processed}/${jobsToProcess.length})`);
                  console.log(`    Verified: normalized_title = "${updated.normalized_title}"`);
                } else {
                  console.warn(`  ⚠ Update returned but value mismatch for job ${job.id}`);
                  errors++;
                }
              } else {
                console.warn(`  ⚠ Update succeeded but no data returned for job ${job.id}`);
                processed++;
              }
            }
          } catch (error) {
            errors++;
            console.error(`  ✗ Error processing job ${job.id}:`, error);
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < jobsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    console.log(`\n✅ Job title normalization complete!`);
    console.log(`   Processed: ${processed}/${jobsToProcess.length}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Skipped: ${skipped}`);
  } catch (error) {
    console.error('Error normalizing job titles for all jobs:', error);
    throw error;
  }
}


