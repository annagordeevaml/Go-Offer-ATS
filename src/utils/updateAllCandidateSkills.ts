import { supabase } from '../lib/supabaseClient';
import { normalizeCandidateSkills } from '../services/skillsNormalization';

/**
 * Update skills for all existing candidates in the database
 * Extracts skills from resume_text and normalizes them
 */
export async function updateAllCandidateSkills(): Promise<void> {
  try {
    console.log('Starting batch skills update for all candidates...');

    // Fetch all candidates with resume_data
    const { data: candidates, error } = await supabase
      .from('candidates')
      .select('id, name, resume_data, skills')
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

    console.log(`Found ${candidatesWithResume.length} candidates with resume content. Starting skills extraction...`);

    // Process candidates in batches of 3 (to avoid rate limits)
    const batchSize = 3;
    let processed = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < candidatesWithResume.length; i += batchSize) {
      const batch = candidatesWithResume.slice(i, i + batchSize);
      
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1} (candidates ${i + 1}-${Math.min(i + batchSize, candidates.length)})...`);

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

            // Extract and normalize skills from resume
            console.log(`  Processing candidate ${candidate.id} (${candidate.name})...`);
            const normalizedSkills = await normalizeCandidateSkills(candidate.id, resumeText);
            
            if (!normalizedSkills || normalizedSkills.length === 0) {
              console.warn(`  ⚠ No skills extracted for candidate ${candidate.id}`);
              skipped++;
              return;
            }

            console.log(`  ✓ Extracted ${normalizedSkills.length} skills for candidate ${candidate.id}`);

            // Update candidate in database
            const { error: updateError } = await supabase
              .from('candidates')
              .update({ skills: normalizedSkills })
              .eq('id', candidate.id);

            if (updateError) {
              console.error(`  ✗ Failed to update candidate ${candidate.id}:`, updateError);
              errors++;
            } else {
              processed++;
              console.log(`  ✓ Updated candidate ${candidate.id} (${processed}/${candidates.length})`);
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

    console.log(`\n✅ Skills update complete!`);
    console.log(`   Processed: ${processed}/${candidatesWithResume.length}`);
    console.log(`   Skipped: ${skipped}`);
    console.log(`   Errors: ${errors}`);
  } catch (error) {
    console.error('Error updating skills for all candidates:', error);
    throw error;
  }
}

