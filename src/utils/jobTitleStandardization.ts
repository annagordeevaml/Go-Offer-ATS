/**
 * Additional post-processing rules for job title standardization
 * This helps ensure consistency across similar job titles
 */

// Common job title mappings for standardization
const STANDARD_TITLE_MAPPINGS: { [key: string]: string } = {
  // Marketing roles
  'marketing and commercial director': 'marketing and commercial director',
  'marketing director': 'marketing director',
  'head of marketing': 'head of marketing',
  'chief marketing officer': 'chief marketing officer',
  'cmo': 'chief marketing officer',
  'marketing manager': 'marketing manager',
  'product marketing manager': 'product marketing manager',
  'digital marketing manager': 'digital marketing manager',
  'marketing specialist': 'marketing specialist',
  'marketing lead': 'marketing lead',
  
  // Product roles
  'product manager': 'product manager',
  'senior product manager': 'senior product manager',
  'product marketing manager': 'product marketing manager',
  'product marketer': 'product marketer',
  'head of product': 'head of product',
  'chief product officer': 'chief product officer',
  'cpo': 'chief product officer',
  
  // Engineering roles
  'software engineer': 'software engineer',
  'senior software engineer': 'senior software engineer',
  'lead software engineer': 'lead software engineer',
  'engineering manager': 'engineering manager',
  'head of engineering': 'head of engineering',
  'chief technology officer': 'chief technology officer',
  'cto': 'chief technology officer',
  
  // Project management
  'project manager': 'project manager',
  'creative project manager': 'creative project manager',
  'senior project manager': 'senior project manager',
  'program manager': 'program manager',
  
  // Other common roles
  'head of lead generation': 'head of lead generation',
  'marketing and growth leader': 'marketing and growth leader',
  'digital marketing and commercial director': 'digital marketing and commercial director',
};

/**
 * Apply additional standardization rules to a normalized job title
 */
export function standardizeJobTitle(normalizedTitle: string): string {
  if (!normalizedTitle || normalizedTitle.trim().length === 0) {
    return '';
  }

  let standardized = normalizedTitle.toLowerCase().trim();

  // Remove quotes (single and double) - in case they weren't removed earlier
  standardized = standardized.replace(/["']/g, '');
  
  // Replace & with and
  standardized = standardized.replace(/&/g, 'and');
  
  // Remove extra whitespace
  standardized = standardized.replace(/\s+/g, ' ').trim();
  
  // Remove common prefixes/suffixes
  standardized = standardized.replace(/^(title|job|role|position):\s*/i, '');
  standardized = standardized.replace(/\s*\(.*?\)\s*/g, ''); // Remove parenthetical content
  standardized = standardized.replace(/\s*\[.*?\]\s*/g, ''); // Remove bracket content
  
  // Remove trailing punctuation
  standardized = standardized.replace(/[.,;:!?]+$/, '');
  
  // Check if we have a standard mapping
  const lowerKey = standardized.toLowerCase();
  if (STANDARD_TITLE_MAPPINGS[lowerKey]) {
    return STANDARD_TITLE_MAPPINGS[lowerKey];
  }
  
  // Try to find partial matches for common patterns
  // For example, "marketing manager" should match even if there are extra words
  for (const [standard, mapped] of Object.entries(STANDARD_TITLE_MAPPINGS)) {
    if (lowerKey.includes(standard) || standard.includes(lowerKey)) {
      // If the input is more specific, keep it; otherwise use the standard
      if (lowerKey.split(' ').length >= standard.split(' ').length) {
        return standardized; // Keep the more specific version
      } else {
        return mapped; // Use the standard version
      }
    }
  }
  
  return standardized;
}


