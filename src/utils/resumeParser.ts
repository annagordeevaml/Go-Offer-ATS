/**
 * Extracts contact information from resume HTML content
 */
export interface ExtractedContacts {
  email: string | null;
  phone: string | null;
  linkedin: string | null;
}

/**
 * Email regex pattern
 */
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/**
 * Phone regex patterns (various formats)
 */
const PHONE_REGEXES = [
  /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, // US format: (123) 456-7890, 123-456-7890, etc.
  /\+?\d{1,3}[-.\s]?\d{1,4}[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, // International format
];

/**
 * LinkedIn URL regex
 */
const LINKEDIN_REGEX = /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/(?:in|pub|profile)\/[\w-]+/gi;

/**
 * Extracts contact information from HTML content
 */
export function extractContacts(htmlContent: string): ExtractedContacts {
  // Create a temporary DOM element to parse HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = htmlContent;

  const textContent = tempDiv.textContent || '';
  const innerHTML = tempDiv.innerHTML;

  // Extract email
  const emailMatches = textContent.match(EMAIL_REGEX);
  const email = emailMatches && emailMatches.length > 0 ? emailMatches[0] : null;

  // Extract phone
  let phone: string | null = null;
  for (const regex of PHONE_REGEXES) {
    const matches = textContent.match(regex);
    if (matches && matches.length > 0) {
      phone = matches[0].trim();
      break;
    }
  }

  // Extract LinkedIn URL
  const linkedinMatches = innerHTML.match(LINKEDIN_REGEX);
  const linkedin = linkedinMatches && linkedinMatches.length > 0 ? linkedinMatches[0] : null;

  return {
    email,
    phone,
    linkedin,
  };
}

/**
 * Removes contact information from HTML content
 */
export function removeContactsFromHtml(htmlContent: string, contacts: ExtractedContacts): string {
  let cleanedHtml = htmlContent;

  // Remove email
  if (contacts.email) {
    const emailRegex = new RegExp(contacts.email.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleanedHtml = cleanedHtml.replace(emailRegex, '');
  }

  // Remove phone
  if (contacts.phone) {
    // Escape special regex characters in phone number
    const phoneEscaped = contacts.phone.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Try different formats
    const phonePatterns = [
      phoneEscaped,
      phoneEscaped.replace(/[-.\s()]/g, '[-.\\s()]?'),
      phoneEscaped.replace(/[-.\s()]/g, ''),
    ];
    
    for (const pattern of phonePatterns) {
      const regex = new RegExp(pattern, 'gi');
      cleanedHtml = cleanedHtml.replace(regex, '');
    }
  }

  // Remove LinkedIn URL (but keep the text "LinkedIn" if present)
  if (contacts.linkedin) {
    const linkedinEscaped = contacts.linkedin.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const linkedinRegex = new RegExp(linkedinEscaped, 'gi');
    cleanedHtml = cleanedHtml.replace(linkedinRegex, '');
    
    // Also remove common LinkedIn link patterns
    cleanedHtml = cleanedHtml.replace(/<a[^>]*href=["']?[^"']*linkedin[^"']*["']?[^>]*>.*?<\/a>/gi, '');
  }

  // Clean up extra whitespace and empty tags
  cleanedHtml = cleanedHtml
    .replace(/\s{2,}/g, ' ')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<div>\s*<\/div>/gi, '')
    .trim();

  return cleanedHtml;
}

