export interface Job {
  id: number;
  title: string;
  location: string;
  postedDate: string;
  matchCount: number;
  skills: string[];
  status: 'active' | 'paused' | 'closed';
}

export interface JobFormData {
  title: string;
  location: string;
  skills: string[];
  level?: string;
  industry?: string;
  description?: string;
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
  status: 'actively_looking' | 'open_to_offers';
  industries: string[];
  relatedIndustries?: string[];
  companyNames?: string[];
  skills: string[];
  whyGreatFit: string;
  socialLinks: SocialLinks;
  calendly?: string;
  resume?: {
    file: File;
    htmlContent: string;
    contacts?: {
      email: string | null;
      phone: string | null;
      linkedin: string | null;
    };
  };
}

