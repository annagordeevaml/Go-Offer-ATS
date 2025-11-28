import { supabase } from '../lib/supabaseClient';
import { normalizeJobTitle, generateJobTitleEmbedding } from '../services/jobTitleNormalization';

/**
 * Re-normalize ALL job titles in the database (including those already normalized)
 * This is useful when the normalization logic has been improved
 */
export async function renormalizeAllJobTitles(): Promise<void> {
  try {
    console.log('Starting re-normalization of ALL job titles (including already normalized ones)...');

    // Fetch ALL candidates with job titles (including those already normalized)
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

    console.log(`Found ${candidates.length} candidates with job titles. Starting re-normalization...`);

    // Process ALL candidates (not filtering by normalized_job_title)
    const candidatesToProcess = candidates;
    console.log(`Will re-normalize ${candidatesToProcess.length} candidates`);

    // Process candidates in batches of 5 to avoid rate limiting
    const batchSize = 5;
    let processed = 0;
    let errors = 0;
    let skipped = 0;
    let updated = 0;

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

            // Re-normalize job title (with improved logic)
            const normalizedTitle = await normalizeJobTitle(jobTitle);
            
            // Check if normalization actually changed anything
            const oldNormalized = candidate.normalized_job_title || '';
            if (normalizedTitle === oldNormalized.toLowerCase().trim()) {
              console.log(`  ⊘ No change for candidate ${candidate.id}: "${normalizedTitle}"`);
              processed++;
              return;
            }

            console.log(`  ✓ Re-normalized: "${jobTitle}" → "${normalizedTitle}"`);
            if (oldNormalized) {
              console.log(`    (was: "${oldNormalized}")`);
            }

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
              updateData.job_title_embedding = embedding;
            }
            
            console.log(`  📝 Updating candidate ${candidate.id}...`);
            
            const { data: updateResult, error: updateError } = await supabase
              .from('candidates')
              .update(updateData)
              .eq('id', candidate.id)
              .select('id, normalized_job_title');

            if (updateError) {
              console.error(`  ✗ Failed to update candidate ${candidate.id}:`, updateError);
              console.error(`  Error details:`, JSON.stringify(updateError, null, 2));
              errors++;
            } else {
              // Verify the update was successful
              if (updateResult && updateResult.length > 0) {
                const updated = updateResult[0];
                if (updated.normalized_job_title === normalizedTitle) {
                  processed++;
                  updated++;
                  console.log(`  ✓ Successfully updated candidate ${candidate.id} (${processed}/${candidatesToProcess.length})`);
                  console.log(`    Verified: normalized_job_title = "${updated.normalized_job_title}"`);
                } else {
                  console.warn(`  ⚠ Update returned but value mismatch for candidate ${candidate.id}`);
                  errors++;
                }
              } else {
                console.warn(`  ⚠ Update succeeded but no data returned for candidate ${candidate.id}`);
                processed++;
                updated++;
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

    console.log(`\n✅ Job title re-normalization complete!`);
    console.log(`   Processed: ${processed}/${candidatesToProcess.length}`);
    console.log(`   Updated: ${updated}`);
    console.log(`   No changes: ${processed - updated}`);
    console.log(`   Errors: ${errors}`);
    console.log(`   Skipped: ${skipped}`);
  } catch (error) {
    console.error('Error re-normalizing job titles for all candidates:', error);
    throw error;
  }
}


