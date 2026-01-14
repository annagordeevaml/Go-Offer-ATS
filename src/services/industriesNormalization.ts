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
 * Normalize and standardize industries using ChatGPT
 * - Translates to English
 * - Converts to lowercase
 * - Standardizes naming (e.g., "FinTech" -> "fintech", "Health Care" -> "healthcare")
 * - Removes duplicates
 * - Returns array of normalized industries
 */
export async function normalizeIndustries(industries: string[]): Promise<string[]> {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Check VITE_OPENAI_API_KEY environment variable.');
  }

  if (!industries || industries.length === 0) {
    return [];
  }

  // Join industries into a single string for processing
  const industriesString = industries.join(', ');

  const systemPrompt = `You are an industry normalization expert. Your task is to normalize and standardize a list of industries.

CRITICAL RULES:
1. Convert all text to English (translate if needed)
2. Convert all text to LOWERCASE
3. Standardize industry names:
   - Remove common variations (e.g., "FinTech" -> "fintech", "Health Care" -> "healthcare", "E-commerce" -> "ecommerce")
   - Use standard industry terminology (e.g., "SaaS" -> "saas", "B2B" -> "b2b", "B2C" -> "b2c")
   - Standardize common abbreviations (e.g., "IT" -> "information technology", "HR" -> "human resources")
   - Remove common prefixes/suffixes (e.g., "Industry:" -> remove, "Sector:" -> remove)
   - Standardize tech-related industries: "EdTech" -> "edtech", "HealthTech" -> "healthtech", "MedTech" -> "medtech", "PropTech" -> "proptech"
4. Remove duplicates (including case variations)
5. Remove empty or meaningless entries
6. Keep only relevant industry names
7. Return as a JSON array of strings, each industry as a separate item
8. Do NOT add any industries that were not in the input
9. Preserve the semantic meaning of each industry
10. Combine related industries when appropriate (e.g., "Healthcare" and "Medical" -> "healthcare")

Examples:
- Input: ["FinTech", "Financial Services", "Banking", "Fintech"]
  Output: ["fintech", "financial services", "banking"]

- Input: ["Health Care", "Healthcare", "Medical", "MedTech"]
  Output: ["healthcare", "medtech"]

- Input: ["E-commerce", "Ecommerce", "Online Retail"]
  Output: ["ecommerce", "online retail"]

- Input: ["SaaS", "Software as a Service", "Cloud Software"]
  Output: ["saas", "cloud software"]

- Input: ["IT", "Information Technology", "Tech"]
  Output: ["information technology", "tech"]

Return ONLY a valid JSON array, no additional text.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Normalize these industries: ${industriesString}` },
      ],
      temperature: 0.3,
      max_tokens: 2000,
    });

    let normalizedIndustriesJson = response.choices[0]?.message?.content?.trim() || '[]';
    
    // Remove markdown code blocks if present
    normalizedIndustriesJson = normalizedIndustriesJson.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Try to parse as JSON
    let normalizedIndustries: string[] = [];
    try {
      normalizedIndustries = JSON.parse(normalizedIndustriesJson);
      if (!Array.isArray(normalizedIndustries)) {
        throw new Error('Response is not an array');
      }
    } catch (parseError) {
      console.error('Error parsing normalized industries JSON:', parseError);
      console.error('Response:', normalizedIndustriesJson);
      // Fallback: try to extract industries from text
      normalizedIndustries = normalizedIndustriesJson
        .replace(/[\[\]"]/g, '')
        .split(',')
        .map(i => i.trim().toLowerCase())
        .filter(i => i.length > 0);
    }

    // Additional post-processing
    normalizedIndustries = normalizedIndustries
      .map(industry => industry.trim().toLowerCase())
      .filter(industry => industry.length > 0 && industry.length < 100) // Remove empty and too long entries
      .filter((industry, index, self) => self.indexOf(industry) === index); // Remove duplicates

    return normalizedIndustries;
  } catch (error) {
    console.error('Error normalizing industries:', error);
    // Fallback: return industries with basic normalization
    return industries
      .map(industry => industry.trim().toLowerCase())
      .filter(industry => industry.length > 0)
      .filter((industry, index, self) => self.indexOf(industry) === index);
  }
}

/**
 * Normalize industries for a candidate
 * Combines industries and related_industries, normalizes them, and returns the normalized list
 */
export async function normalizeCandidateIndustries(
  industries: string[] = [],
  relatedIndustries: string[] = []
): Promise<string[]> {
  // Combine all industries
  const allIndustries = [...industries, ...relatedIndustries].filter(Boolean);
  
  if (allIndustries.length === 0) {
    return [];
  }

  // Normalize all industries together
  const normalizedIndustries = await normalizeIndustries(allIndustries);
  
  return normalizedIndustries;
}

/**
 * Generate embedding for normalized industries
 * Combines all industries into a single string and generates an embedding
 */
export async function generateIndustriesEmbedding(normalizedIndustries: string[]): Promise<number[] | null> {
  if (!normalizedIndustries || normalizedIndustries.length === 0) {
    return null;
  }

  try {
    const { generateEmbedding } = await import('./embeddingsService');
    // Combine all industries into a single string for embedding
    const industriesString = normalizedIndustries.join(', ');
    return await generateEmbedding(industriesString);
  } catch (error) {
    console.error('Error generating industries embedding:', error);
    return null;
  }
}


