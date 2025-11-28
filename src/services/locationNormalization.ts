import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;

if (!apiKey) {
  console.warn('OpenAI API key is not set. Please add VITE_OPENAI_API_KEY to your .env file');
}

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
}) : null;

/**
 * Normalize and standardize location using ChatGPT
 * Returns standardized location in English with format: city/state/region/country/remote/relocation
 */
export async function normalizeLocation(location: string): Promise<string> {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Check VITE_OPENAI_API_KEY environment variable.');
  }

  if (!location || location.trim().length === 0) {
    return '';
  }

  const systemPrompt = `You are a location normalization expert. Your task is to normalize and standardize locations to LinkedIn-style format.

CRITICAL RULES:
1. Convert all text to English (translate if needed)
2. Use proper capitalization (Title Case for cities/states, UPPERCASE for country abbreviations)
3. Standardize location format to LinkedIn style:
   - "Remote" - if location indicates remote work
   - "City, State" - for US locations (e.g., "New York, NY", "San Francisco, CA")
   - "City, Country" - for international locations (e.g., "London, United Kingdom", "Berlin, Germany")
   - "State, United States" - for US states without city (e.g., "California, United States")
   - "Region, Country" - for regions (e.g., "West Coast, United States", "Europe")
4. Standardize country names to full names:
   - "USA" / "US" / "United States" → "United States"
   - "UK" → "United Kingdom"
   - Use full country names, not abbreviations (except for US states)
5. Standardize US state abbreviations:
   - Use 2-letter state codes (e.g., "NY", "CA", "TX")
   - For states without city: "State, United States" (e.g., "California, United States")
6. Remove extra words like "willing to relocate to", "open to", etc.
7. If location mentions relocation willingness, extract the actual location, not the willingness
8. Output ONLY the normalized location in LinkedIn format, nothing else
9. Do NOT add quotes around the output
10. For US locations: Always use "City, State" format (e.g., "New York, NY", "Los Angeles, CA")
11. For international: Use "City, Country" with full country name (e.g., "London, United Kingdom", "Paris, France")

Examples:
- "New York, NY" → "New York, NY"
- "San Francisco Bay Area" → "San Francisco, CA"
- "Remote" → "Remote"
- "Willing to relocate to California" → "California, United States"
- "London, UK" → "London, United Kingdom"
- "Berlin, Germany" → "Berlin, Germany"
- "West Coast, USA" → "West Coast, United States"
- "Europe" → "Europe"
- "Anywhere" → "Remote"
- "SF" → "San Francisco, CA"
- "NYC" → "New York, NY"`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Normalize this location: "${location}"` },
      ],
      temperature: 0.3,
      max_tokens: 100,
    });

    let normalizedLocation = response.choices[0]?.message?.content?.trim() || location;
    
    // Fallback: if response is empty or seems invalid, return original
    if (!normalizedLocation || normalizedLocation.length === 0) {
      normalizedLocation = location.trim();
    }

    // Post-processing: additional cleanup
    // Remove quotes (single and double)
    normalizedLocation = normalizedLocation.replace(/["']/g, '');
    
    // Remove extra whitespace
    normalizedLocation = normalizedLocation.replace(/\s+/g, ' ').trim();
    
    // Remove common prefixes/suffixes
    normalizedLocation = normalizedLocation.replace(/^(location|place|city|area):\s*/i, '');
    normalizedLocation = normalizedLocation.replace(/\s*\(.*?\)\s*/g, ''); // Remove parenthetical content
    
    // Keep proper capitalization (LinkedIn format uses Title Case)
    // Only normalize "remote" to "Remote" for consistency
    if (normalizedLocation.toLowerCase() === 'remote') {
      normalizedLocation = 'Remote';
    }
    
    // Ensure proper LinkedIn format capitalization
    // Don't convert entire string to lowercase - preserve Title Case from AI response
    
    return normalizedLocation.trim();
  } catch (error) {
    console.error('Error normalizing location:', error);
    // Return original location if normalization fails
    return location.trim().toLowerCase();
  }
}

/**
 * Generate embedding for a normalized location
 */
export async function generateLocationEmbedding(normalizedLocation: string): Promise<number[] | null> {
  if (!normalizedLocation || normalizedLocation.trim().length === 0) {
    return null;
  }

  try {
    const { generateEmbedding } = await import('./embeddingsService');
    return await generateEmbedding(normalizedLocation);
  } catch (error) {
    console.error('Error generating location embedding:', error);
    return null;
  }
}

