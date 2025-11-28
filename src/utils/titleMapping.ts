/**
 * Generalized title categories
 */
export const GENERAL_TITLES = [
  'CEO',
  'COO',
  'CTO',
  'CPO',
  'CMO',
  'CFO',
  'CHRO',
  'Product Manager',
  'Program Manager',
  'Project Manager',
  'Software Engineer',
  'Backend Engineer',
  'Frontend Engineer',
  'Full-Stack Engineer',
  'DevOps Engineer',
  'Cloud Engineer',
  'Cybersecurity Engineer',
  'Data Engineer',
  'Machine Learning Engineer',
  'Analyst',
  'BI Developer',
  'Data Scientist',
  'QA',
  'UX/UI Designer',
  'Product Designer',
  'Graphic Designer',
  'Motion Designer',
  'Marketing Manager',
  'Content Manager',
  'Social Media Manager',
  'Sales Manager',
  'Business Development Manager',
  'Account Manager',
  'Customer Success Manager',
  'Customer Support Manager',
  'Operations Manager',
  'Supply Chain Manager',
  'Logistics Manager',
  'Strategy Manager',
  'Event Manager',
  'Finance Manager',
  'HR Manager',
  'Legal Counsel',
  'Recruiter',
  'Office Manager',
  'IT Support',
  'Data Architect',
  'AI Engineer',
  'Other',
] as const;

export type GeneralTitle = typeof GENERAL_TITLES[number];

/**
 * Normalize title for matching (lowercase, remove punctuation)
 */
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Check if title contains any of the keywords
 */
function containsKeywords(title: string, keywords: string[]): boolean {
  const normalized = normalizeTitle(title);
  return keywords.some(keyword => normalized.includes(keyword.toLowerCase()));
}

/**
 * Map raw job title to generalized title using fuzzy matching rules
 * 
 * @param rawTitle - Raw job title from resume
 * @returns General title category
 */
export function mapToGeneralTitle(rawTitle: string): GeneralTitle {
  if (!rawTitle || !rawTitle.trim()) {
    return 'Other';
  }

  const normalized = normalizeTitle(rawTitle);

  // C-level titles
  if (containsKeywords(normalized, ['ceo', 'chief executive officer'])) return 'CEO';
  if (containsKeywords(normalized, ['coo', 'chief operating officer'])) return 'COO';
  if (containsKeywords(normalized, ['cto', 'chief technology officer', 'chief technical officer'])) return 'CTO';
  if (containsKeywords(normalized, ['cpo', 'chief product officer'])) return 'CPO';
  if (containsKeywords(normalized, ['cmo', 'chief marketing officer'])) return 'CMO';
  if (containsKeywords(normalized, ['cfo', 'chief financial officer'])) return 'CFO';
  if (containsKeywords(normalized, ['chro', 'chief human resources officer', 'chief hr officer'])) return 'CHRO';

  // Marketing titles
  if (containsKeywords(normalized, ['growth marketing', 'performance marketing', 'ppc', 'paid search', 'paid social', 'growth manager'])) return 'Marketing Manager';
  if (containsKeywords(normalized, ['marketing manager', 'marketing lead', 'marketing director'])) return 'Marketing Manager';
  if (containsKeywords(normalized, ['content manager', 'content marketing', 'content lead'])) return 'Content Manager';
  if (containsKeywords(normalized, ['social media manager', 'smm', 'social media specialist'])) return 'Social Media Manager';

  // Engineering titles - AI/ML
  if (containsKeywords(normalized, ['ml engineer', 'machine learning engineer', 'ml developer', 'machine learning developer'])) return 'Machine Learning Engineer';
  if (containsKeywords(normalized, ['ai engineer', 'artificial intelligence engineer', 'ai developer'])) return 'AI Engineer';
  if (containsKeywords(normalized, ['data scientist', 'data science'])) return 'Data Scientist';

  // Engineering titles - Full Stack
  if (containsKeywords(normalized, ['fullstack', 'full stack', 'full-stack'])) return 'Full-Stack Engineer';
  if (containsKeywords(normalized, ['full stack engineer', 'fullstack engineer', 'full-stack engineer'])) return 'Full-Stack Engineer';

  // Engineering titles - Frontend
  if (containsKeywords(normalized, ['frontend', 'front-end', 'front end', 'react', 'vue', 'angular', 'javascript developer'])) return 'Frontend Engineer';
  if (containsKeywords(normalized, ['frontend engineer', 'front-end engineer', 'front end engineer'])) return 'Frontend Engineer';

  // Engineering titles - Backend
  if (containsKeywords(normalized, ['backend', 'back-end', 'back end', 'node', 'python developer', 'java developer', 'go developer'])) return 'Backend Engineer';
  if (containsKeywords(normalized, ['backend engineer', 'back-end engineer', 'back end engineer'])) return 'Backend Engineer';

  // Engineering titles - Other
  if (containsKeywords(normalized, ['software engineer', 'software developer', 'developer', 'programmer'])) return 'Software Engineer';
  if (containsKeywords(normalized, ['devops', 'dev ops', 'sre', 'site reliability'])) return 'DevOps Engineer';
  if (containsKeywords(normalized, ['cloud engineer', 'aws', 'azure', 'gcp engineer'])) return 'Cloud Engineer';
  if (containsKeywords(normalized, ['cybersecurity', 'security engineer', 'infosec'])) return 'Cybersecurity Engineer';
  if (containsKeywords(normalized, ['data engineer', 'etl', 'data pipeline'])) return 'Data Engineer';
  if (containsKeywords(normalized, ['data architect', 'data architecture'])) return 'Data Architect';

  // Design titles
  if (containsKeywords(normalized, ['ux/ui', 'ux designer', 'ui designer', 'user experience', 'user interface'])) return 'UX/UI Designer';
  if (containsKeywords(normalized, ['product designer', 'product design'])) return 'Product Designer';
  if (containsKeywords(normalized, ['graphic designer', 'graphic design'])) return 'Graphic Designer';
  if (containsKeywords(normalized, ['motion designer', 'motion graphics', 'animation'])) return 'Motion Designer';

  // Product/Program/Project Management
  if (containsKeywords(normalized, ['product manager', 'pm', 'product lead'])) return 'Product Manager';
  if (containsKeywords(normalized, ['program manager', 'program management'])) return 'Program Manager';
  if (containsKeywords(normalized, ['project manager', 'project management', 'pmp'])) return 'Project Manager';

  // Sales titles
  if (containsKeywords(normalized, ['sales manager', 'sales lead', 'sales director'])) return 'Sales Manager';
  if (containsKeywords(normalized, ['account executive', 'ae', 'sales executive', 'sales rep'])) return 'Sales Manager';
  if (containsKeywords(normalized, ['business development', 'bdr', 'sdr', 'business dev'])) return 'Business Development Manager';
  if (containsKeywords(normalized, ['account manager', 'key account'])) return 'Account Manager';

  // Customer Success/Support
  if (containsKeywords(normalized, ['customer success', 'cs manager', 'customer success manager'])) return 'Customer Success Manager';
  if (containsKeywords(normalized, ['csr', 'customer support', 'customer service', 'support manager'])) return 'Customer Support Manager';

  // Operations
  if (containsKeywords(normalized, ['operations manager', 'ops manager', 'operations lead'])) return 'Operations Manager';
  if (containsKeywords(normalized, ['supply chain', 'supply chain manager'])) return 'Supply Chain Manager';
  if (containsKeywords(normalized, ['logistics', 'logistics manager'])) return 'Logistics Manager';

  // Other Management
  if (containsKeywords(normalized, ['strategy manager', 'strategy lead', 'strategic planning'])) return 'Strategy Manager';
  if (containsKeywords(normalized, ['event manager', 'events manager', 'event planning'])) return 'Event Manager';
  if (containsKeywords(normalized, ['finance manager', 'financial manager', 'finance lead'])) return 'Finance Manager';
  if (containsKeywords(normalized, ['hr manager', 'human resources manager', 'people manager', 'talent manager'])) return 'HR Manager';

  // Other roles
  if (containsKeywords(normalized, ['qa', 'quality assurance', 'tester', 'test engineer', 'quality engineer'])) return 'QA';
  if (containsKeywords(normalized, ['analyst', 'data analyst', 'business analyst'])) return 'Analyst';
  if (containsKeywords(normalized, ['bi developer', 'business intelligence', 'bi engineer'])) return 'BI Developer';
  if (containsKeywords(normalized, ['recruiter', 'talent acquisition', 'recruiting'])) return 'Recruiter';
  if (containsKeywords(normalized, ['legal counsel', 'attorney', 'lawyer', 'legal advisor'])) return 'Legal Counsel';
  if (containsKeywords(normalized, ['office manager', 'office administrator', 'administrative manager'])) return 'Office Manager';
  if (containsKeywords(normalized, ['it support', 'help desk', 'technical support', 'it helpdesk'])) return 'IT Support';

  // Default fallback
  return 'Other';
}

/**
 * Check if two general titles are related
 * Returns true if titles are in the same category or related categories
 */
export function areTitlesRelated(title1: GeneralTitle, title2: GeneralTitle): boolean {
  if (title1 === title2) return true;
  if (title1 === 'Other' || title2 === 'Other') return false;

  // C-level to Manager mappings
  const cLevelToManager: Record<string, string> = {
    'CMO': 'Marketing Manager',
    'CFO': 'Finance Manager',
    'CHRO': 'HR Manager',
    'CTO': 'Software Engineer', // Technical leadership
    'COO': 'Operations Manager',
  };

  // Check if one is C-level and other is related manager
  if (cLevelToManager[title1] === title2 || cLevelToManager[title2] === title1) {
    return true;
  }

  // Engineering categories
  const engineeringTitles = [
    'Software Engineer',
    'Backend Engineer',
    'Frontend Engineer',
    'Full-Stack Engineer',
    'DevOps Engineer',
    'Cloud Engineer',
    'Cybersecurity Engineer',
    'Data Engineer',
    'Machine Learning Engineer',
    'AI Engineer',
  ];
  if (engineeringTitles.includes(title1) && engineeringTitles.includes(title2)) {
    return true;
  }

  // Design categories
  const designTitles = [
    'UX/UI Designer',
    'Product Designer',
    'Graphic Designer',
    'Motion Designer',
  ];
  if (designTitles.includes(title1) && designTitles.includes(title2)) {
    return true;
  }

  // Management categories
  const managementTitles = [
    'Product Manager',
    'Program Manager',
    'Project Manager',
    'Marketing Manager',
    'Sales Manager',
    'Operations Manager',
  ];
  if (managementTitles.includes(title1) && managementTitles.includes(title2)) {
    return true;
  }

  return false;
}


