import { supabase } from '../lib/supabaseClient';
import { normalizeJobTitle, generateJobTitleEmbedding } from '../services/jobTitleNormalization';

/**
 * Normalize job titles and generate embeddings for all existing candidates in the database
 * This function processes candidates in batches to avoid overwhelming the API
 */
export async function normalizeAllJobTitles(): Promise<void> {
  try {
    console.log('Starting batch job title normalization for all candidates...');

    // First, check if the columns exist by trying to select them
    const { data: testData, error: testError } = await supabase
      .from('candidates')
      .select('id, normalized_job_title')
      .limit(1);

    if (testError && (
      testError.message.includes('normalized_job_title') ||
      testError.message.includes('column') ||
      testError.message.includes('does not exist')
    )) {
      throw new Error(
        'Database schema error: The columns "normalized_job_title" and/or "job_title_embedding" do not exist.\n\n' +
        'Please run the SQL script "add_normalized_job_title_fields.sql" in Supabase Dashboard first.'
      );
    }

    // Fetch all candidates with job titles
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('id, job_title, normalized_job_title')
      .not('job_title', 'is', null)
      .neq('job_title', '')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch candidates: ${error.message}`);
    }

    if (!candidates || candidates.length === 0) {
      console.log('No candidates with job titles found in database');
      return;
    }

    console.log(`Found ${candidates.length} candidates with job titles. Starting normalization...`);

    // Filter out candidates that already have normalized_job_title
    const candidatesToProcess = candidates.filter(c => !c.normalized_job_title);
    console.log(`${candidatesToProcess.length} candidates need normalization (${candidates.length - candidatesToProcess.length} already normalized)`);

    if (candidatesToProcess.length === 0) {
      console.log('All candidates already have normalized job titles!');
      return;
    }

    // Process candidates in batches of 5 to avoid rate limiting
    const batchSize = 5;
    let processed = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < candidatesToProcess.length; i += batchSize) {
      const batch = candidatesToProcess.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (candidates ${i + 1}-${Math.min(i + batchSize, candidatesToProcess.length)})...`);

      // Process batch in parallel
      await Promise.all(
        batch.map(async (candidate) => {
          try {
            const jobTitle = candidate.job_title;
            if (!jobTitle || jobTitle.trim().length === 0) {
              skipped++;
              return;
            }

            // Normalize job title (already returns lowercase)
            const normalizedTitle = await normalizeJobTitle(jobTitle);
            console.log(`  ✓ Normalized: "${jobTitle}" → "${normalizedTitle}"`);

            // Generate embedding (use lowercase version)
            const embedding = await generateJobTitleEmbedding(normalizedTitle);
            
            if (!embedding || embedding.length === 0) {
              console.warn(`  ⚠ Failed to generate embedding for candidate ${candidate.id}`);
              errors++;
              return;
            }

            // Update candidate in database
            const updateData: any = {
              normalized_job_title: normalizedTitle,
            };
            
            // Add embedding if available (Supabase expects array for vector type)
            if (embedding && embedding.length > 0) {
              // Ensure embedding is a proper array
              updateData.job_title_embedding = Array.isArray(embedding) ? embedding : null;
            }
            
            console.log(`  📝 Updating candidate ${candidate.id} with:`, {
              normalized_job_title: normalizedTitle,
              has_embedding: !!(embedding && embedding.length > 0),
              embedding_length: embedding?.length || 0
            });
            
            const { data: updateResult, error: updateError } = await supabase
              .from('candidates')
              .update(updateData)
              .eq('id', candidate.id)
              .select('id, normalized_job_title');

            if (updateError) {
              console.error(`  ✗ Failed to update candidate ${candidate.id}:`, updateError);
              console.error(`  Error details:`, JSON.stringify(updateError, null, 2));
              
              // Check if error is about missing columns
              if (updateError.message && (
                updateError.message.includes('normalized_job_title') ||
                updateError.message.includes('job_title_embedding') ||
                updateError.message.includes('column') ||
                updateError.message.includes('does not exist')
              )) {
                console.error(`  ⚠ Database schema issue: The columns 'normalized_job_title' and/or 'job_title_embedding' may not exist.`);
                console.error(`  Please run the SQL script 'add_normalized_job_title_fields.sql' in Supabase Dashboard.`);
              }
              
              errors++;
            } else {
              // Verify the update was successful
              if (updateResult && updateResult.length > 0) {
                const updated = updateResult[0];
                if (updated.normalized_job_title === normalizedTitle) {
                  processed++;
                  console.log(`  ✓ Successfully updated candidate ${candidate.id} (${processed}/${candidatesToProcess.length})`);
                  console.log(`    Verified: normalized_job_title = "${updated.normalized_job_title}"`);
                } else {
                  console.warn(`  ⚠ Update returned but value mismatch for candidate ${candidate.id}`);
                  console.warn(`    Expected: "${normalizedTitle}", Got: "${updated.normalized_job_title}"`);
                  errors++;
                }
              } else {
                console.warn(`  ⚠ Update succeeded but no data returned for candidate ${candidate.id}`);
                processed++;
              }
            }
          } catch (error) {
            errors++;
            console.error(`  ✗ Error processing candidate ${candidate.id}:`, error);
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < candidatesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
      }
    }

    console.log(`\n✅ Job title normalization complete!`);
    console.log(`   Processed: ${processed}/${candidatesToProcess.length}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Skipped: ${skipped}`);
  } catch (error) {
    console.error('Error normalizing job titles for all candidates:', error);
    throw error;
  }
}

