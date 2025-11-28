/**
 * Utility script to update unified titles for all candidates
 * This should be run from the browser console or as a one-time migration script
 */

import { supabase } from '../lib/supabaseClient';
import { parseResumeWithAI } from '../services/resumeParserService';
import { addRelatedTitles } from './unifiedTitlesMapping';

export async function updateAllCandidatesUnifiedTitles() {
  try {
    // Load all candidates with resume data
    const { data: candidates, error: fetchError } = await supabase
      .from('candidates')
      .select('id, resume_data, job_title')
      .not('resume_data', 'is', null);

    if (fetchError) {
      console.error('Error fetching candidates:', fetchError);
      return;
    }

    if (!candidates || candidates.length === 0) {
      console.log('No candidates with resume data found');
      return;
    }

    console.log(`Found ${candidates.length} candidates to update`);

    let updated = 0;
    let errors = 0;

    for (const candidate of candidates) {
      try {
        const resumeData = candidate.resume_data;
        if (!resumeData || !resumeData.html_content) {
          console.log(`Skipping candidate ${candidate.id} - no resume content`);
          continue;
        }

        // Extract text from HTML resume
        let resumeText = '';
        if (typeof document !== 'undefined') {
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = resumeData.html_content;
          resumeText = tempDiv.textContent || tempDiv.innerText || '';
        } else {
          // Fallback for server-side: remove HTML tags using regex
          resumeText = resumeData.html_content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }

        if (!resumeText.trim()) {
          console.log(`Skipping candidate ${candidate.id} - empty resume text`);
          continue;
        }

        // Parse resume with AI to get unified titles
        const parsedData = await parseResumeWithAI(resumeText);
        
        if (!parsedData || !parsedData.unified_titles) {
          console.log(`Skipping candidate ${candidate.id} - no unified titles found`);
          continue;
        }

        let unifiedTitles = Array.isArray(parsedData.unified_titles)
          ? parsedData.unified_titles.filter(t => t && t.trim() !== '')
          : [];

        // Add related titles (e.g., CMO → Marketing Manager)
        if (unifiedTitles.length > 0) {
          unifiedTitles = addRelatedTitles(unifiedTitles);
        }

        if (unifiedTitles.length === 0) {
          console.log(`Skipping candidate ${candidate.id} - no unified titles after processing`);
          continue;
        }

        // Delete existing unified titles from relationship table
        await supabase
          .from('candidate_unified_titles')
          .delete()
          .eq('candidate_id', candidate.id);

        // Insert new unified titles into relationship table
        const titlesToInsert = unifiedTitles.map(title => ({
          candidate_id: candidate.id,
          unified_title: title,
        }));

        const { error: insertError } = await supabase
          .from('candidate_unified_titles')
          .insert(titlesToInsert);

        if (insertError) {
          console.error(`Error inserting titles for candidate ${candidate.id}:`, insertError);
          errors++;
          continue;
        }

        // Update unified_titles array in main table
        try {
          await supabase
            .from('candidates')
            .update({ unified_titles: unifiedTitles })
            .eq('id', candidate.id);
        } catch (err) {
          console.warn(`Could not update unified_titles column for candidate ${candidate.id}:`, err);
        }

        updated++;
        console.log(`Updated candidate ${candidate.id} with ${unifiedTitles.length} unified titles`);

        // Add a small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error processing candidate ${candidate.id}:`, error);
        errors++;
      }
    }

    console.log(`\nUpdate complete!`);
    console.log(`Updated: ${updated}`);
    console.log(`Errors: ${errors}`);
  } catch (error) {
    console.error('Fatal error:', error);
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).updateAllCandidatesUnifiedTitles = updateAllCandidatesUnifiedTitles;
}

