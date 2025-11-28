import { supabase } from '../lib/supabaseClient';
import { normalizeLocation, generateLocationEmbedding } from '../services/locationNormalization';

/**
 * Normalize locations and generate embeddings for all existing candidates in the database
 */
export async function normalizeAllCandidateLocations(): Promise<void> {
  try {
    console.log('Starting batch location normalization for all candidates...');

    // Fetch all candidates with locations
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('id, location, normalized_location')
      .not('location', 'is', null)
      .neq('location', '')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch candidates: ${error.message}`);
    }

    if (!candidates || candidates.length === 0) {
      console.log('No candidates with locations found in database');
      return;
    }

    console.log(`Found ${candidates.length} candidates with locations. Starting normalization...`);

    // Filter out candidates that already have normalized_location
    const candidatesToProcess = candidates.filter(c => !c.normalized_location);
    console.log(`${candidatesToProcess.length} candidates need normalization (${candidates.length - candidatesToProcess.length} already normalized)`);

    if (candidatesToProcess.length === 0) {
      console.log('All candidates already have normalized locations!');
      return;
    }

    // Process candidates in batches of 5
    const batchSize = 5;
    let processed = 0;
    let errors = 0;

    for (let i = 0; i < candidatesToProcess.length; i += batchSize) {
      const batch = candidatesToProcess.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (candidates ${i + 1}-${Math.min(i + batchSize, candidatesToProcess.length)})...`);

      await Promise.all(
        batch.map(async (candidate) => {
          try {
            const location = candidate.location;
            if (!location || location.trim().length === 0) {
              return;
            }

            // Normalize location
            const normalizedLoc = await normalizeLocation(location);
            console.log(`  ✓ Normalized: "${location}" → "${normalizedLoc}"`);

            // Generate embedding
            const embedding = await generateLocationEmbedding(normalizedLoc);
            
            if (!embedding || embedding.length === 0) {
              console.warn(`  ⚠ Failed to generate embedding for candidate ${candidate.id}`);
              errors++;
              return;
            }

            // Update candidate in database
            const updateData: any = {
              normalized_location: normalizedLoc,
              location_embedding: embedding,
            };
            
            const { error: updateError } = await supabase
              .from('candidates')
              .update(updateData)
              .eq('id', candidate.id);

            if (updateError) {
              console.error(`  ✗ Failed to update candidate ${candidate.id}:`, updateError);
              errors++;
            } else {
              processed++;
              console.log(`  ✓ Updated candidate ${candidate.id} (${processed}/${candidatesToProcess.length})`);
            }
          } catch (error) {
            errors++;
            console.error(`  ✗ Error processing candidate ${candidate.id}:`, error);
          }
        })
      );

      // Delay between batches
      if (i + batchSize < candidatesToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n✅ Location normalization complete!`);
    console.log(`   Processed: ${processed}/${candidatesToProcess.length}`);
    console.log(`   Errors: ${errors}`);
  } catch (error) {
    console.error('Error normalizing locations for all candidates:', error);
    throw error;
  }
}

/**
 * Normalize locations and generate embeddings for all existing jobs in the database
 */
export async function normalizeAllJobLocations(): Promise<void> {
  try {
    console.log('Starting batch location normalization for all jobs...');

    // Fetch all jobs with locations
    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, location, normalized_location')
      .not('location', 'is', null)
      .neq('location', '')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch jobs: ${error.message}`);
    }

    if (!jobs || jobs.length === 0) {
      console.log('No jobs with locations found in database');
      return;
    }

    console.log(`Found ${jobs.length} jobs with locations. Starting normalization...`);

    // Filter out jobs that already have normalized_location
    const jobsToProcess = jobs.filter(j => !j.normalized_location);
    console.log(`${jobsToProcess.length} jobs need normalization (${jobs.length - jobsToProcess.length} already normalized)`);

    if (jobsToProcess.length === 0) {
      console.log('All jobs already have normalized locations!');
      return;
    }

    // Process jobs in batches of 5
    const batchSize = 5;
    let processed = 0;
    let errors = 0;

    for (let i = 0; i < jobsToProcess.length; i += batchSize) {
      const batch = jobsToProcess.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (jobs ${i + 1}-${Math.min(i + batchSize, jobsToProcess.length)})...`);

      await Promise.all(
        batch.map(async (job) => {
          try {
            const location = job.location;
            if (!location || location.trim().length === 0) {
              return;
            }

            // Normalize location
            const normalizedLoc = await normalizeLocation(location);
            console.log(`  ✓ Normalized: "${location}" → "${normalizedLoc}"`);

            // Generate embedding
            const embedding = await generateLocationEmbedding(normalizedLoc);
            
            if (!embedding || embedding.length === 0) {
              console.warn(`  ⚠ Failed to generate embedding for job ${job.id}`);
              errors++;
              return;
            }

            // Update job in database
            const updateData: any = {
              normalized_location: normalizedLoc,
              location_embedding: embedding,
            };
            
            const { error: updateError } = await supabase
              .from('jobs')
              .update(updateData)
              .eq('id', job.id);

            if (updateError) {
              console.error(`  ✗ Failed to update job ${job.id}:`, updateError);
              errors++;
            } else {
              processed++;
              console.log(`  ✓ Updated job ${job.id} (${processed}/${jobsToProcess.length})`);
            }
          } catch (error) {
            errors++;
            console.error(`  ✗ Error processing job ${job.id}:`, error);
          }
        })
      );

      // Delay between batches
      if (i + batchSize < jobsToProcess.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    console.log(`\n✅ Location normalization complete!`);
    console.log(`   Processed: ${processed}/${jobsToProcess.length}`);
    console.log(`   Errors: ${errors}`);
  } catch (error) {
    console.error('Error normalizing locations for all jobs:', error);
    throw error;
  }
}


