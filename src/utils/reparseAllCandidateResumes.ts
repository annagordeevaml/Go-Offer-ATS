import { supabase } from '../lib/supabaseClient';
import { parseResumeWithAI } from '../services/resumeParserService';
import { normalizeCandidateIndustries, generateIndustriesEmbedding } from '../services/industriesNormalization';

/**
 * Re-parse all candidate resumes with improved industry extraction
 * Updates industries and related_industries for all candidates
 */
export async function reparseAllCandidateResumes(): Promise<void> {
  try {
    console.log('Starting batch resume re-parsing for all candidates...');

    // Fetch all candidates with resume_data
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('id, name, resume_data, industries, related_industries')
      .not('resume_data', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch candidates: ${error.message}`);
    }

    if (!candidates || candidates.length === 0) {
      console.log('No candidates with resume data found in database');
      return;
    }

    // Filter candidates that have resume_data with html_content
    const candidatesWithResume = candidates.filter(c => {
      if (!c.resume_data) return false;
      try {
        const resumeData = typeof c.resume_data === 'string' 
          ? JSON.parse(c.resume_data) 
          : c.resume_data;
        return resumeData && resumeData.html_content && resumeData.html_content.trim().length > 0;
      } catch {
        return false;
      }
    });

    if (candidatesWithResume.length === 0) {
      console.log('No candidates with resume content found in database');
      return;
    }

    console.log(`Found ${candidatesWithResume.length} candidates with resume content. Starting re-parsing...`);

    // Process candidates in batches of 3 (to avoid rate limits)
    const batchSize = 3;
    let processed = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < candidatesWithResume.length; i += batchSize) {
      const batch = candidatesWithResume.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (candidates ${i + 1}-${Math.min(i + batchSize, candidatesWithResume.length)})...`);

      await Promise.all(
        batch.map(async (candidate) => {
          try {
            // Extract resume text from resume_data
            let resumeText = '';
            try {
              const resumeData = typeof candidate.resume_data === 'string' 
                ? JSON.parse(candidate.resume_data) 
                : candidate.resume_data;
              
              if (resumeData && resumeData.html_content) {
                // Extract plain text from HTML
                resumeText = resumeData.html_content
                  .replace(/<[^>]*>/g, ' ') // Remove HTML tags
                  .replace(/\s+/g, ' ') // Normalize whitespace
                  .trim();
              }
            } catch (parseError) {
              console.error(`  ✗ Failed to parse resume_data for candidate ${candidate.id}:`, parseError);
              skipped++;
              return;
            }

            if (!resumeText || resumeText.trim().length === 0) {
              skipped++;
              return;
            }

            // Re-parse resume with improved prompt
            console.log(`  Re-parsing resume for candidate ${candidate.id} (${candidate.name})...`);
            const { data: parsedData } = await parseResumeWithAI(resumeText);

            // Extract industries from parsed data
            const mainIndustries = Array.isArray(parsedData.main_industries) 
              ? parsedData.main_industries.filter(i => i && i.trim() !== '') 
              : [];
            const relatedIndustries = Array.isArray(parsedData.other_related_industries)
              ? parsedData.other_related_industries.filter(i => i && i.trim() !== '')
              : [];

            if (mainIndustries.length === 0 && relatedIndustries.length === 0) {
              console.warn(`  ⚠ No industries extracted for candidate ${candidate.id}`);
              skipped++;
              return;
            }

            console.log(`  ✓ Extracted ${mainIndustries.length} main industries and ${relatedIndustries.length} related industries for candidate ${candidate.id}`);

            // Normalize industries and generate embedding
            let normalizedIndustries: string[] = [];
            let industriesEmbedding: number[] | null = null;

            if (mainIndustries.length > 0 || relatedIndustries.length > 0) {
              try {
                normalizedIndustries = await normalizeCandidateIndustries(mainIndustries, relatedIndustries);
                
                if (normalizedIndustries.length > 0) {
                  industriesEmbedding = await generateIndustriesEmbedding(normalizedIndustries);
                }
              } catch (normalizationError) {
                console.error(`  ✗ Error normalizing industries for candidate ${candidate.id}:`, normalizationError);
                // Continue with non-normalized industries
                normalizedIndustries = [...mainIndustries, ...relatedIndustries]
                  .map(i => i.trim().toLowerCase())
                  .filter(i => i.length > 0)
                  .filter((i, idx, self) => self.indexOf(i) === idx);
              }
            }

            // Prepare update data
            const updateData: any = {
              industries: mainIndustries,
              related_industries: relatedIndustries,
            };

            if (normalizedIndustries.length > 0) {
              updateData.normalized_industries = normalizedIndustries;
            }

            if (industriesEmbedding && industriesEmbedding.length > 0) {
              updateData.industries_embedding = industriesEmbedding;
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
              console.log(`  ✓ Updated candidate ${candidate.id} (${processed}/${candidatesWithResume.length})`);
            }
          } catch (error) {
            errors++;
            console.error(`  ✗ Error processing candidate ${candidate.id}:`, error);
          }
        })
      );

      // Delay between batches to avoid rate limits
      if (i + batchSize < candidatesWithResume.length) {
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay between batches
      }
    }

    console.log(`\n✅ Resume re-parsing complete!`);
    console.log(`   Processed: ${processed}/${candidatesWithResume.length}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
  } catch (error) {
    console.error('Error re-parsing resumes for all candidates:', error);
    throw error;
  }
}


