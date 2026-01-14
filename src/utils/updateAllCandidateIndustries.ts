import { supabase } from '../lib/supabaseClient';
import { normalizeCandidateIndustries, generateIndustriesEmbedding } from '../services/industriesNormalization';

/**
 * Update normalized industries and embeddings for all existing candidates in the database
 * Normalizes industries and related_industries fields
 */
export async function updateAllCandidateIndustries(): Promise<void> {
  try {
    console.log('Starting batch industries update for all candidates...');

    // Fetch all candidates with industries or related_industries
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('id, name, industries, related_industries, normalized_industries')
      .or('industries.not.is.null,related_industries.not.is.null')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch candidates: ${error.message}`);
    }

    if (!candidates || candidates.length === 0) {
      console.log('No candidates with industries found in database');
      return;
    }

    // Filter candidates that have industries or related_industries
    const candidatesWithIndustries = candidates.filter(c => {
      const hasIndustries = c.industries && Array.isArray(c.industries) && c.industries.length > 0;
      const hasRelatedIndustries = c.related_industries && Array.isArray(c.related_industries) && c.related_industries.length > 0;
      return hasIndustries || hasRelatedIndustries;
    });

    if (candidatesWithIndustries.length === 0) {
      console.log('No candidates with industries data found in database');
      return;
    }

    console.log(`Found ${candidatesWithIndustries.length} candidates with industries. Starting normalization...`);

    // Process candidates in batches of 3 (to avoid rate limits)
    const batchSize = 3;
    let processed = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < candidatesWithIndustries.length; i += batchSize) {
      const batch = candidatesWithIndustries.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (candidates ${i + 1}-${Math.min(i + batchSize, candidatesWithIndustries.length)})...`);

      await Promise.all(
        batch.map(async (candidate) => {
          try {
            // Skip if already normalized (optional - remove if you want to re-normalize)
            if (candidate.normalized_industries && Array.isArray(candidate.normalized_industries) && candidate.normalized_industries.length > 0) {
              console.log(`  ⏭ Skipping candidate ${candidate.id} - already has normalized industries`);
              skipped++;
              return;
            }

            const industries = Array.isArray(candidate.industries) ? candidate.industries : [];
            const relatedIndustries = Array.isArray(candidate.related_industries) ? candidate.related_industries : [];

            if (industries.length === 0 && relatedIndustries.length === 0) {
              skipped++;
              return;
            }

            // Normalize industries
            console.log(`  Processing candidate ${candidate.id} (${candidate.name})...`);
            console.log(`    Industries: ${industries.join(', ')}`);
            console.log(`    Related Industries: ${relatedIndustries.join(', ')}`);
            
            const normalizedIndustries = await normalizeCandidateIndustries(industries, relatedIndustries);
            
            if (!normalizedIndustries || normalizedIndustries.length === 0) {
              console.warn(`  ⚠ No normalized industries for candidate ${candidate.id}`);
              skipped++;
              return;
            }

            console.log(`  ✓ Normalized ${normalizedIndustries.length} industries for candidate ${candidate.id}`);
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

            // Update candidate in database
            const { error: updateError } = await supabase
              .from('candidates')
              .update(updateData)
              .eq('id', candidate.id);

            if (updateError) {
              console.error(`  ✗ Failed to update candidate ${candidate.id}:`, updateError);
              errors++;
            } else {
              processed++;
              console.log(`  ✓ Updated candidate ${candidate.id} (${processed}/${candidatesWithIndustries.length})`);
            }
          } catch (error) {
            errors++;
            console.error(`  ✗ Error processing candidate ${candidate.id}:`, error);
          }
        })
      );

      // Delay between batches to avoid rate limits
      if (i + batchSize < candidatesWithIndustries.length) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay between batches
      }
    }

    console.log(`\n✅ Industries update complete!`);
    console.log(`   Processed: ${processed}/${candidatesWithIndustries.length}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
  } catch (error) {
    console.error('Error updating industries for all candidates:', error);
    throw error;
  }
}


