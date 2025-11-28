export interface Job {
  id: number;
  title: string;
  location: string; // Keep for backward compatibility, but locations is preferred
  locations?: string[]; // Array of standardized locations (e.g., "San Francisco, CA", "New York, NY")
  postedDate: string;
  matchCount: number;
  skills: string[];
  status: 'active' | 'paused' | 'closed';
  companyName?: string;
  industry?: string[]; // Array of industries (as tags)
  unifiedTitles?: string[]; // Array of standardized unified job titles
  description?: string; // Job description
  workplaceType?: 'Remote' | 'On-site' | 'Hybrid'; // Workplace type
  employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Internship'; // Employment type
  seniorityLevel?: 'Internship' | 'Entry level' | 'Associate' | 'Mid-Senior level' | 'Director' | 'Executive' | 'Not Applicable'; // Seniority level
  consideringRelocation?: boolean; // Whether the job considers candidates willing to relocate
  acceptsRemoteCandidates?: boolean; // Whether the job accepts remote candidates
}

export interface JobDescription {
  id: number;
  jobTitle: string;
  location: string;
  jobDescription: string;
  companyName: string;
  consideringRelocation: boolean;
  industry: string[]; // Array of industries (as tags)
  hardSkills: string[]; // Array of hard skills
  createdAt: string;
  postedDate: string; // Date when job was posted
  status: 'active' | 'paused' | 'closed';
  unifiedTitles?: string[]; // Array of standardized unified job titles
  rawJson?: string; // Raw JSON from ChatGPT for debugging
}

export interface JobFormData {
  title: string;
  location: string; // Keep for backward compatibility
  locations?: string[]; // Array of standardized locations
  skills: string[];
  industry?: string | string[]; // Can be string or array of strings
  companyName?: string;
  description?: string;
  consideringRelocation?: boolean;
  acceptsRemoteCandidates?: boolean; // Whether the job accepts remote candidates
  unifiedTitles?: string[]; // Array of standardized unified job titles
  workplaceType?: 'Remote' | 'On-site' | 'Hybrid';
  employmentType?: 'Full-time' | 'Part-time' | 'Contract' | 'Temporary' | 'Internship';
  seniorityLevel?: 'Internship' | 'Entry level' | 'Associate' | 'Mid-Senior level' | 'Director' | 'Executive' | 'Not Applicable';
}

export interface SocialLinks {
  linkedin?: string;
  github?: string;
  portfolio?: string;
  otherSocialMedia?: string;
  calendly?: string;
}

export interface Candidate {
  id: number;
  name: string;
  jobTitle: string;
  location: string;
  experience: string;
  availability: string;
  readyToRelocateTo: string[];
  lastUpdated: string;
  matchScore: number;
  locationScore?: number; // Location matching score (0.0 to 1.0) - old format
  locationMatchScore?: number; // Location matching score (0.0 to 20.0) - new format
  titleScore?: number; // Title matching score (0.0 to 20.0)
  status: 'actively_looking' | 'open_to_offers';
  industries: string[];
  relatedIndustries?: string[];
  companyNames?: string[];
  skills: string[];
  summary: string;
  socialLinks: SocialLinks;
  calendly?: string;
  salaryMin?: string; // Minimum salary, e.g., "100000"
  salaryMax?: string; // Maximum salary, e.g., "150000"
  salaryUnit?: 'year' | 'month' | 'hour'; // Salary unit: per year, per month, or per hour
  unifiedTitles?: string[]; // Array of standardized unified job titles
  // Summary from different GPT models
  summariesByModel?: {
    'gpt-4o'?: string;
    'gpt-4o-mini'?: string;
    'gpt-4-turbo'?: string;
    'gpt-3.5-turbo'?: string;
    'o1-mini'?: string;
  };
  resume?: {
    file: File | null;
    htmlContent: string;
    contacts?: {
      email: string | null;
      phone: string | null;
      linkedin: string | null;
    };
  };
}

