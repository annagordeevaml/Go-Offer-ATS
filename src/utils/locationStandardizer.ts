import OpenAI from 'openai';

const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

const openai = apiKey ? new OpenAI({
  apiKey: apiKey,
  dangerouslyAllowBrowser: true,
}) : null;

/**
 * Standardizes a location string to LinkedIn format (e.g., "San Francisco, CA" or "London, England")
 */
export async function standardizeLocation(location: string): Promise<string> {
  if (!location || !location.trim()) return location;
  
  // If already in standard format (contains comma), return as is
  if (location.includes(',')) {
    return location.trim();
  }

  if (!openai) {
    // Fallback: return as is if no API key
    return location.trim();
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: 'You are a location standardizer. Convert location strings to LinkedIn-style format: "City, State" for US locations, "City, Country" for international locations. Examples: "SF" -> "San Francisco, CA", "NYC" -> "New York, NY", "London" -> "London, England", "Remote" -> "Remote". Return ONLY the standardized location, no additional text.',
        },
        {
          role: 'user',
          content: `Standardize this location: ${location}`,
        },
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const standardized = response.choices[0]?.message?.content?.trim() || location;
    return standardized;
  } catch (error) {
    console.error('Error standardizing location:', error);
    return location.trim();
  }
}

/**
 * Standardizes multiple locations
 */
export async function standardizeLocations(locations: string[]): Promise<string[]> {
  if (!locations || locations.length === 0) return [];
  
  const standardized = await Promise.all(
    locations.map(loc => standardizeLocation(loc))
  );
  
  return standardized.filter(loc => loc && loc.trim() !== '');
}


