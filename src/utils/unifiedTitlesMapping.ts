/**
 * Mapping of C-level titles to their related manager titles
 * When a C-level title is assigned, automatically add the related manager title
 */

export const C_LEVEL_MAPPINGS: Record<string, string[]> = {
  'CEO': [], // CEO doesn't map to a specific manager role
  'COO': ['Operations Manager'],
  'CTO': [], // CTO doesn't map to a specific manager role (could be Engineering Manager, but that's not in our list)
  'CPO': ['Product Manager'],
  'CMO': ['Marketing Manager'],
  'CFO': ['Finance Manager'],
  'CHRO': ['HR Manager'],
};

/**
 * Get related titles for a given unified title
 */
export function getRelatedTitles(unifiedTitle: string): string[] {
  return C_LEVEL_MAPPINGS[unifiedTitle] || [];
}

/**
 * Add related titles when a C-level title is selected
 */
export function addRelatedTitles(titles: string[]): string[] {
  const result = new Set(titles);
  
  titles.forEach(title => {
    const related = getRelatedTitles(title);
    related.forEach(relatedTitle => {
      result.add(relatedTitle);
    });
  });
  
  return Array.from(result);
}

/**
 * Sorted list of all unified titles in alphabetical order
 */
export const UNIFIED_TITLES_SORTED = [
  'Account Manager',
  'Analyst',
  'Backend Engineer',
  'BI Developer',
  'CEO',
  'CFO',
  'CHRO',
  'Cloud Engineer',
  'CMO',
  'COO',
  'Content Manager',
  'CPO',
  'CTO',
  'Customer Success Manager',
  'Customer Support Manager',
  'Cybersecurity Engineer',
  'Data Engineer',
  'Data Scientist',
  'DevOps Engineer',
  'Event Manager',
  'Finance Manager',
  'Frontend Engineer',
  'Full-Stack Engineer',
  'Graphic Designer',
  'HR Manager',
  'Legal Counsel',
  'Logistics Manager',
  'Machine Learning Engineer',
  'Marketing Manager',
  'Mobile Engineer',
  'Motion Designer',
  'Operations Manager',
  'Others',
  'Product Designer',
  'Product Manager',
  'Program Manager',
  'Project Manager',
  'QA',
  'Recruiter',
  'Sales Manager',
  'SDET',
  'Social Media Manager',
  'Software Engineer',
  'Strategy Manager',
  'Supply Chain Manager',
  'UX/UI Designer',
];


