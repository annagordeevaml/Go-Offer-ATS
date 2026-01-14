import { supabase } from '../lib/supabaseClient';
import { normalizeIndustries, generateIndustriesEmbedding } from '../services/industriesNormalization';

/**
 * Update normalized industries and embeddings for all existing jobs in the database
 * Normalizes industry field
 */
export async function updateAllJobIndustries(): Promise<void> {
  try {
    console.log('Starting batch industries update for all jobs...');

    // Fetch all jobs with industry
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, title, industry, normalized_industries')
      .or('industry.not.is.null')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('No jobs with industry found in database');
      return;
    }

    // Filter jobs that have industry data
    const jobsWithIndustries = jobs.filter(job => {
      // Handle both array and string formats
      if (Array.isArray(job.industry)) {
        return job.industry.length > 0;
      }
      if (typeof job.industry === 'string') {
        return job.industry.trim().length > 0;
      }
      return false;
    });

    if (jobsWithIndustries.length === 0) {
      console.log('No jobs with industry data found in database');
      return;
    }

    console.log(`Found ${jobsWithIndustries.length} jobs with industries. Starting normalization...`);

    // Process jobs in batches of 3 (to avoid rate limits)
    const batchSize = 3;
    let processed = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < jobsWithIndustries.length; i += batchSize) {
      const batch = jobsWithIndustries.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (jobs ${i + 1}-${Math.min(i + batchSize, jobsWithIndustries.length)})...`);

      await Promise.all(
        batch.map(async (job) => {
          try {
            // Skip if already normalized (optional - remove if you want to re-normalize)
            if (job.normalized_industries && Array.isArray(job.normalized_industries) && job.normalized_industries.length > 0) {
              console.log(`  ⏭ Skipping job ${job.id} - already has normalized industries`);
              skipped++;
              return;
            }

            // Convert industry to array format
            let industries: string[] = [];
            if (Array.isArray(job.industry)) {
              industries = job.industry;
            } else if (typeof job.industry === 'string') {
              industries = job.industry.split(',').map(i => i.trim()).filter(i => i.length > 0);
            }

            if (industries.length === 0) {
              skipped++;
              return;
            }

            // Normalize industries
            console.log(`  Processing job ${job.id} (${job.title})...`);
            console.log(`    Industries: ${industries.join(', ')}`);
            
            const normalizedIndustries = await normalizeIndustries(industries);
            
            if (!normalizedIndustries || normalizedIndustries.length === 0) {
              console.warn(`  ⚠ No normalized industries for job ${job.id}`);
              skipped++;
              return;
            }

            console.log(`  ✓ Normalized ${normalizedIndustries.length} industries for job ${job.id}`);
            console.log(`    Normalized: ${normalizedIndustries.join(', ')}`);

            // Generate embedding
            const embedding = await generateIndustriesEmbedding(normalizedIndustries);

            // Prepare update data
            const updateData: {
              normalized_industries: string[];
              industries_embedding?: number[] | null;
            } = {
              normalized_industries: normalizedIndustries,
            };

            if (embedding) {
              updateData.industries_embedding = embedding;
            }

            // Update job in database
            const { error: updateError } = await supabase
              .from('jobs')
              .update(updateData)
              .eq('id', job.id);

            if (updateError) {
              console.error(`  ✗ Failed to update job ${job.id}:`, updateError);
              errors++;
            } else {
              processed++;
              console.log(`  ✓ Updated job ${job.id} (${processed}/${jobsWithIndustries.length})`);
            }
          } catch (error) {
            errors++;
            console.error(`  ✗ Error processing job ${job.id}:`, error);
          }
        })
      );

      // Delay between batches to avoid rate limits
      if (i + batchSize < jobsWithIndustries.length) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay between batches
      }
    }

    console.log(`\n✅ Industries update complete!`);
    console.log(`   Processed: ${processed}/${jobsWithIndustries.length}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
  } catch (error) {
    console.error('Error updating industries for all jobs:', error);
    throw error;
  }
}


