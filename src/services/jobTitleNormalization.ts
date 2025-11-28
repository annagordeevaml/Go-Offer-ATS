import OpenAI from 'openai';
import { standardizeJobTitle } from '../utils/jobTitleStandardization';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

if (!apiKey) {
  console.warn('OpenAI API key is not set. Please add VITE_OPENAI_API_KEY to your .env file');
}

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
}) : null;

/**
 * Normalize and standardize a job title using ChatGPT
 * Returns the normalized job title in English
 */
export async function normalizeJobTitle(jobTitle: string): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Check VITE_OPENAI_API_KEY environment variable.');
  }

  if (!jobTitle || jobTitle.trim().length === 0) {
    return '';
  }

  const systemPrompt = `You are a job title normalization and standardization expert. Your task is to normalize and standardize job titles to a clean, consistent, professional English format in LOWERCASE.

CRITICAL RULES:
1. Convert all text to English (translate if needed)
2. Output in LOWERCASE only (all letters must be lowercase)
3. Replace "&" with "and" (e.g., "Marketing & Sales" → "marketing and sales")
4. Remove ALL quotes (single and double) from the output
5. Remove company-specific terms, abbreviations, or internal codes
6. Standardize common variations:
   - "Sr." / "Senior" → "senior"
   - "Jr." / "Junior" → "junior"
   - "VP" / "Vice President" → "vice president"
   - "Head of" → "head of" (keep as is)
   - "Director" → "director"
   - "Manager" → "manager"
   - "Lead" → "lead"
   - "Chief" / "C-level" → keep as "chief" (e.g., "CMO" → "chief marketing officer")
7. Remove location-specific terms unless they are part of the standard title
8. Remove parenthetical information like "(ML/AI)", "(Remote)", etc.
9. Standardize job title structure:
   - Use consistent order: [seniority] [domain] [role type]
   - Examples: "senior product manager", "marketing director", "head of engineering"
10. Remove redundant words and simplify where possible
11. Output ONLY the normalized job title in lowercase, nothing else
12. Do NOT add quotes around the output

Examples:
- "Senior Software Engineer at Google" → "senior software engineer"
- "Sr. Product Manager" → "senior product manager"
- "Разработчик Python" → "python developer"
- "Data Scientist (ML/AI)" → "data scientist"
- "VP of Engineering" → "vice president of engineering"
- "CTO & Co-founder" → "chief technology officer"
- "Software Engineer II" → "software engineer"
- "Full Stack Developer" → "full stack developer"
- "Marketing & Commercial Director" → "marketing and commercial director"
- "Head of Marketing" → "head of marketing"
- "Product Marketing Manager" → "product marketing manager"
- "Chief Marketing Officer" → "chief marketing officer"
- "Digital Marketing and Commercial Director" → "digital marketing and commercial director"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Normalize this job title: "${jobTitle}"` },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    let normalizedTitle = response.choices[0]?.message?.content?.trim() || jobTitle;
    
    // Fallback: if response is empty or seems invalid, return original
    if (!normalizedTitle || normalizedTitle.length === 0) {
      normalizedTitle = jobTitle.trim();
    }

    // Post-processing: additional cleanup
    // Remove quotes (single and double)
    normalizedTitle = normalizedTitle.replace(/["']/g, '');
    
    // Replace & with and
    normalizedTitle = normalizedTitle.replace(/&/g, 'and');
    
    // Remove extra whitespace
    normalizedTitle = normalizedTitle.replace(/\s+/g, ' ').trim();
    
    // Convert to lowercase (in case AI didn't follow instructions)
    normalizedTitle = normalizedTitle.toLowerCase();
    
    // Remove common prefixes/suffixes that shouldn't be there
    normalizedTitle = normalizedTitle.replace(/^(title|job|role|position):\s*/i, '');
    normalizedTitle = normalizedTitle.replace(/\s*\(.*?\)\s*/g, ''); // Remove parenthetical content
    normalizedTitle = normalizedTitle.replace(/\s*\[.*?\]\s*/g, ''); // Remove bracket content
    
    // Remove trailing punctuation
    normalizedTitle = normalizedTitle.replace(/[.,;:!?]+$/, '');
    
    // Apply additional standardization rules
    normalizedTitle = standardizeJobTitle(normalizedTitle.trim());
    
    return normalizedTitle.trim();
  } catch (error) {
    console.error('Error normalizing job title:', error);
    // Return original title if normalization fails
    return jobTitle.trim();
  }
}

/**
 * Generate embedding for a normalized job title
 */
export async function generateJobTitleEmbedding(normalizedJobTitle: string): Promise<number[] | null> {
  if (!normalizedJobTitle || normalizedJobTitle.trim().length === 0) {
    return null;
  }

  try {
    const { generateEmbedding } = await import('./embeddingsService');
    return await generateEmbedding(normalizedJobTitle);
  } catch (error) {
    console.error('Error generating job title embedding:', error);
    return null;
  }
}

