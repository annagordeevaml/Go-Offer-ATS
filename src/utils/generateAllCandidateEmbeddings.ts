import { supabase } from '../lib/supabaseClient';
import { generateCandidateEmbeddings } from '../services/embeddingsService';

/**
 * Generate embeddings for all existing candidates in the database
 * This function processes candidates in batches to avoid overwhelming the API
 */
export async function generateAllCandidateEmbeddings(): Promise<void> {
  try {
    console.log('Starting batch embedding generation for all candidates...');

    // Fetch all candidates
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('id, full_name, name')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch candidates: ${error.message}`);
    }

    if (!candidates || candidates.length === 0) {
      console.log('No candidates found in database');
      return;
    }

    console.log(`Found ${candidates.length} candidates. Starting embedding generation...`);

    // Process candidates in batches of 5 to avoid rate limiting
    const batchSize = 5;
    let processed = 0;
    let errors = 0;

    for (let i = 0; i < candidates.length; i += batchSize) {
      const batch = candidates.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (candidates ${i + 1}-${Math.min(i + batchSize, candidates.length)})...`);

      // Process batch in parallel
      await Promise.all(
        batch.map(async (candidate) => {
          try {
            await generateCandidateEmbeddings(candidate.id);
            processed++;
            const name = candidate.full_name || candidate.name || 'Unknown';
            console.log(`✓ Generated embeddings for ${name} (${processed}/${candidates.length})`);
          } catch (error) {
            errors++;
            const name = candidate.full_name || candidate.name || 'Unknown';
            console.error(`✗ Failed to generate embeddings for ${name}:`, error);
          }
        })
      );

      // Small delay between batches to avoid rate limiting
      if (i + batchSize < candidates.length) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay
      }
    }

    console.log(`\n✅ Embedding generation complete!`);
    console.log(`   Processed: ${processed}/${candidates.length}`);
    console.log(`   Errors: ${errors}`);
  } catch (error) {
    console.error('Error generating embeddings for all candidates:', error);
    throw error;
  }
}


