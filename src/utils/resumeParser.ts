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

/**
 * Removes name, surname, and main location from resume HTML
 */
export function removeNameAndLocationFromHtml(
  htmlContent: string,
  fullName: string,
  location: string
): string {
  let cleanedHtml = htmlContent;

  // Remove full name (handle various formats)
  if (fullName) {
    const nameParts = fullName.split(' ').filter(Boolean);
    // Try to remove full name and individual parts
    nameParts.forEach(part => {
      if (part.length > 2) { // Only remove meaningful parts
        const nameRegex = new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        cleanedHtml = cleanedHtml.replace(nameRegex, '');
      }
    });
    // Also try full name as is
    const fullNameRegex = new RegExp(fullName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    cleanedHtml = cleanedHtml.replace(fullNameRegex, '');
  }

  // Remove location (handle various formats)
  if (location && location !== 'Not specified') {
    const locationParts = location.split(',').map(p => p.trim()).filter(Boolean);
    locationParts.forEach(part => {
      if (part.length > 2) {
        const locationRegex = new RegExp(part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        cleanedHtml = cleanedHtml.replace(locationRegex, '');
      }
    });
  }

  // Clean up extra whitespace
  cleanedHtml = cleanedHtml
    .replace(/\s{2,}/g, ' ')
    .replace(/<p>\s*<\/p>/gi, '')
    .replace(/<div>\s*<\/div>/gi, '')
    .trim();

  return cleanedHtml;
}

/**
 * Formats resume HTML for better display
 */
export function formatResumeHtml(htmlContent: string): string {
  let formatted = htmlContent;

  // Create a temporary DOM element to parse and manipulate HTML
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = formatted;

  // Process all elements to add bullet points for indented content
  const processElement = (element: HTMLElement) => {
    // Check for indented content (left padding/margin)
    const computedStyle = window.getComputedStyle ? window.getComputedStyle(element) : null;
    const paddingLeft = computedStyle?.paddingLeft || element.style.paddingLeft || '';
    const marginLeft = computedStyle?.marginLeft || element.style.marginLeft || '';
    const textIndent = computedStyle?.textIndent || element.style.textIndent || '';
    
    const leftOffset = parseInt(paddingLeft) || parseInt(marginLeft) || parseInt(textIndent) || 0;
    
    // If element has significant left offset (indented), convert to bullet point
    if (leftOffset > 20) {
      const text = element.textContent?.trim() || '';
      if (text && !text.match(/^[•\-\*]/) && !element.tagName.match(/^(H[1-6]|STRONG|B)$/i)) {
        element.innerHTML = `• ${element.innerHTML}`;
      }
    }

    // Process children recursively
    Array.from(element.children).forEach(child => {
      processElement(child as HTMLElement);
    });
  };

  // Process all top-level elements
  Array.from(tempDiv.children).forEach(child => {
    processElement(child as HTMLElement);
  });

  formatted = tempDiv.innerHTML;

  // Ensure bullet points are visible (replace various bullet characters with •)
  formatted = formatted.replace(/[•\u2022\u25CF\u25E6\u2043]/g, '•');
  
  // Convert list items to have visible bullets
  formatted = formatted.replace(/<li[^>]*>/gi, '<li style="list-style-type: disc; margin-left: 20px;">');

  // Format company names - make them bold
  // Pattern: Company name followed by dates or job titles
  formatted = formatted.replace(
    /(<p[^>]*>|<div[^>]*>)\s*([A-Z][A-Za-z0-9\s&.,\-'()]+(?:Inc|LLC|Corp|Ltd|Company|Co\.|Technologies|Systems|Solutions)?)\s*([–—\-]|to|–)\s*(\d{4}|\w+\s+\d{4})/gi,
    (match, tag, company, separator, date) => {
      return `${tag}<strong>${company.trim()}</strong><br/>${date}`;
    }
  );

  // Also handle company names without dates on the same line
  formatted = formatted.replace(
    /(<p[^>]*>|<div[^>]*>)\s*([A-Z][A-Za-z0-9\s&.,\-'()]+(?:Inc|LLC|Corp|Ltd|Company|Co\.|Technologies|Systems|Solutions)?)\s*(?=<br|<p|<div|$)/gi,
    (match, tag, company) => {
      // Only if it looks like a company name (not already bold, not a bullet point)
      if (!match.includes('<strong>') && !match.includes('•')) {
        return `${tag}<strong>${company.trim()}</strong>`;
      }
      return match;
    }
  );

  // Ensure dates are on new line after company (if not already)
  formatted = formatted.replace(
    /(<strong>[^<]+<\/strong>)\s*([–—\-]|to)\s*(\d{4}|\w+\s+\d{4})/gi,
    '<strong>$1</strong><br/>$3'
  );

  // Add spacing between major sections
  const sectionHeaders = [
    'Key Achievements', 'Experience', 'Education', 'Skills', 'Summary', 
    'Professional Experience', 'Work Experience', 'Employment', 'Career',
    'Technical Skills', 'Core Competencies', 'Summary of Qualifications'
  ];
  
  sectionHeaders.forEach(header => {
    const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(<\/p>|<\/div>)\\s*(<p[^>]*>|<h[1-6][^>]*>|<div[^>]*>)\\s*${escapedHeader}`, 'gi');
    formatted = formatted.replace(regex, '$1<br/><br/>$2$3');
  });

  // Add spacing before each new company (before bold company names)
  formatted = formatted.replace(
    /(<\/p>|<\/div>)\s*(<p[^>]*>|<div[^>]*>)\s*(<strong>[A-Z][^<]+<\/strong>)/gi,
    '$1<br/><br/>$2$3'
  );

  // Remove extra spaces in Skills section (between skills, keep them on one line)
  const skillsSectionMatch = formatted.match(/(<p[^>]*>|<div[^>]*>|<h[1-6][^>]*>)\s*Skills?\s*:?\s*(<\/p>|<\/div>|<\/h[1-6]>)/i);
  if (skillsSectionMatch) {
    const skillsIndex = formatted.indexOf(skillsSectionMatch[0]);
    if (skillsIndex !== -1) {
      // Find the end of skills section (next major section or end)
      const afterSkills = formatted.substring(skillsIndex + skillsSectionMatch[0].length);
      const nextSectionMatch = afterSkills.match(/(<p[^>]*>|<div[^>]*>|<h[1-6][^>]*>)\s*(Experience|Education|Summary|Key Achievements)/i);
      const skillsEndIndex = nextSectionMatch 
        ? skillsIndex + skillsSectionMatch[0].length + afterSkills.indexOf(nextSectionMatch[0])
        : formatted.length;
      
      const skillsContent = formatted.substring(skillsIndex + skillsSectionMatch[0].length, skillsEndIndex);
      const cleanedSkills = skillsContent
        .replace(/\n\s*\n/g, ' ')
        .replace(/<br\s*\/?>\s*<br\s*\/?>/gi, ' ')
        .replace(/\s{2,}/g, ' ')
        .trim();
      
      formatted = formatted.substring(0, skillsIndex + skillsSectionMatch[0].length) + 
                  cleanedSkills + 
                  formatted.substring(skillsEndIndex);
    }
  }

  // Clean up multiple consecutive breaks (max 2)
  formatted = formatted.replace(/(<br\s*\/?>){3,}/gi, '<br/><br/>');

  // Clean up empty paragraphs and divs
  formatted = formatted.replace(/<p[^>]*>\s*<\/p>/gi, '');
  formatted = formatted.replace(/<div[^>]*>\s*<\/div>/gi, '');

  return formatted;
}

