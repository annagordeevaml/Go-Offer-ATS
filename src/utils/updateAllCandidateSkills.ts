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

    // Process candidates one by one (sequentially to avoid rate limits)
    let processed = 0;
    let errors = 0;
    let skipped = 0;

    for (let i = 0; i < candidatesWithResume.length; i++) {
      const candidate = candidatesWithResume[i];
      
      console.log(`\n[${i + 1}/${candidatesWithResume.length}] Processing candidate ${candidate.id} (${candidate.name})...`);

      try {
        // Extract resume text from resume_data
        let resumeText = '';
        try {
          const resumeData = typeof candidate.resume_data === 'string' 
            ? JSON.parse(candidate.resume_data) 
            : candidate.resume_data;
          
          console.log(`  → Resume data type: ${typeof resumeData}, has html_content: ${!!resumeData?.html_content}`);
          
          if (resumeData && resumeData.html_content) {
            // Extract plain text from HTML
            resumeText = resumeData.html_content
              .replace(/<[^>]*>/g, ' ') // Remove HTML tags
              .replace(/\s+/g, ' ') // Normalize whitespace
              .trim();
            
            console.log(`  → Extracted ${resumeText.length} characters of text from resume`);
          } else {
            console.warn(`  ⚠ No html_content found in resume_data for candidate ${candidate.id}`);
            skipped++;
            continue;
          }
        } catch (parseError) {
          console.error(`  ✗ Failed to parse resume_data for candidate ${candidate.id}:`, parseError);
          skipped++;
          continue;
        }

        if (!resumeText || resumeText.trim().length === 0) {
          console.warn(`  ⚠ Empty resume text for candidate ${candidate.id}`);
          skipped++;
          continue;
        }

        // Extract and normalize skills from resume using ChatGPT
        console.log(`  → Sending resume text to ChatGPT for skills extraction...`);
        const normalizedSkills = await normalizeCandidateSkills(candidate.id, resumeText);
        
        if (!normalizedSkills || normalizedSkills.length === 0) {
          console.warn(`  ⚠ No skills extracted for candidate ${candidate.id}`);
          skipped++;
          continue;
        }

        console.log(`  ✓ Extracted ${normalizedSkills.length} skills:`, normalizedSkills.slice(0, 10).join(', '), normalizedSkills.length > 10 ? '...' : '');

        // Update candidate in database - save to hard_skills column
        console.log(`  → Saving to hard_skills column in database...`);
        const { error: updateError } = await supabase
          .from('candidates')
          .update({ hard_skills: normalizedSkills })
          .eq('id', candidate.id);

        if (updateError) {
          console.error(`  ✗ Failed to update candidate ${candidate.id}:`, updateError);
          console.error(`  → Error details:`, updateError.message, updateError.details, updateError.hint);
          errors++;
        } else {
          processed++;
          console.log(`  ✓ Successfully updated candidate ${candidate.id} with ${normalizedSkills.length} skills`);
        }
      } catch (error) {
        errors++;
        console.error(`  ✗ Error processing candidate ${candidate.id}:`, error);
        if (error instanceof Error) {
          console.error(`  → Error message:`, error.message);
          console.error(`  → Error stack:`, error.stack);
        }
      }

      // Delay between candidates to avoid rate limits (3 second delay)
      if (i < candidatesWithResume.length - 1) {
        console.log(`  → Waiting 3 seconds before next candidate...`);
        await new Promise(resolve => setTimeout(resolve, 3000)); // 3 second delay between candidates
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

