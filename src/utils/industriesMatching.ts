import { cosineSimilarity, semanticSimilarity } from './vectorSimilarity';

/**
 * Extract work experience in each industry from resume text
 * Returns a map: industry -> { years: number, count: number }
 */
function extractIndustryExperience(
  resumeText: string,
  candidateIndustries: string[]
): Map<string, { years: number; count: number }> {
  const industryExperience = new Map<string, { years: number; count: number }>();
  
  if (!resumeText || !candidateIndustries || candidateIndustries.length === 0) {
    return industryExperience;
  }

  // Normalize industries for matching
  const normalizedIndustries = candidateIndustries.map(i => i.trim().toLowerCase());
  const text = resumeText.toLowerCase();
  
  // Pattern to find date ranges: "Jan 2020 - Dec 2022" or "2020 - 2022" or "2020-2022"
  const datePattern = /(\d{4}|\w+\s+\d{4})\s*[-–—]\s*(\d{4}|\w+\s+\d{4}|present|current|now|today)/gi;
  
  // Split text into sections (usually by company/position)
  // Look for patterns like "Company Name", "Job Title", dates
  const sections: Array<{ text: string; dates: Array<{ start: number; end: number | null }> }> = [];
  
  // Find all date ranges in the text
  const allDates: Array<{ match: RegExpMatchArray; startYear: number; endYear: number | null }> = [];
  let dateMatch;
  const dateRegex = new RegExp(datePattern);
  
  while ((dateMatch = dateRegex.exec(text)) !== null) {
    const startStr = dateMatch[1];
    const endStr = dateMatch[2];
    
    // Extract year from start
    const startYearMatch = startStr.match(/\d{4}/);
    const startYear = startYearMatch ? parseInt(startYearMatch[0]) : null;
    
    // Extract year from end (or null if present/current)
    let endYear: number | null = null;
    if (endStr && !/present|current|now|today/i.test(endStr)) {
      const endYearMatch = endStr.match(/\d{4}/);
      endYear = endYearMatch ? parseInt(endYearMatch[0]) : null;
    }
    
    if (startYear) {
      allDates.push({
        match: dateMatch,
        startYear,
        endYear
      });
    }
  }
  
  // For each industry, find work experience
  normalizedIndustries.forEach(industry => {
    let totalYears = 0;
    let workCount = 0;
    const processedDates = new Set<string>(); // Track which date ranges we've counted
    
    // Look for industry mentions
    const industryRegex = new RegExp(`\\b${industry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
    const industryMatches = [...text.matchAll(industryRegex)];
    
    // For each industry mention, find nearby date ranges
    industryMatches.forEach(match => {
      const matchIndex = match.index || 0;
      
      // Find the closest date range to this industry mention
      let closestDate: typeof allDates[0] | null = null;
      let minDistance = Infinity;
      
      allDates.forEach(dateInfo => {
        const dateIndex = dateInfo.match.index || 0;
        const distance = Math.abs(dateIndex - matchIndex);
        
        // Only consider dates within 500 characters
        if (distance < 500 && distance < minDistance) {
          minDistance = distance;
          closestDate = dateInfo;
        }
      });
      
      if (closestDate) {
        const dateKey = `${closestDate.startYear}-${closestDate.endYear || 'present'}`;
        
        // Count this work experience only once per date range
        if (!processedDates.has(dateKey)) {
          processedDates.add(dateKey);
          workCount++;
          
          // Calculate years
          if (closestDate.endYear) {
            const years = closestDate.endYear - closestDate.startYear;
            totalYears += Math.max(0, years);
          } else {
            // If end date is "present", calculate from start to current year
            const currentYear = new Date().getFullYear();
            const years = currentYear - closestDate.startYear;
            totalYears += Math.max(0, years);
          }
        }
      }
    });
    
    if (workCount > 0 || totalYears > 0) {
      industryExperience.set(industry, { 
        years: totalYears, 
        count: workCount 
      });
    }
  });
  
  return industryExperience;
}

/**
 * Calculate industries match score - simplified logic
 * Logic:
 * - If there's ANY intersection between candidate industries and job industries: 100 points
 * - If no intersection: 0 points
 */
export async function calculateIndustriesMatchScoreByExperience(
  candidateIndustries: string[] | string | null | undefined,
  candidateResumeText: string | null | undefined,
  jobIndustries: string[] | string | null | undefined
): Promise<number> {
  // Convert to arrays if needed
  const candidateArray = Array.isArray(candidateIndustries) 
    ? candidateIndustries 
    : (typeof candidateIndustries === 'string' ? [candidateIndustries] : []);
  const jobArray = Array.isArray(jobIndustries) 
    ? jobIndustries 
    : (typeof jobIndustries === 'string' ? [jobIndustries] : []);

  // If either list is empty, return 0
  if (!candidateArray || candidateArray.length === 0) {
    return 0;
  }
  if (!jobArray || jobArray.length === 0) {
    return 0;
  }

  // Normalize industries (lowercase, trim)
  const normalizedCandidate = candidateArray.map(i => String(i).trim().toLowerCase()).filter(i => i.length > 0);
  const normalizedJob = jobArray.map(i => String(i).trim().toLowerCase()).filter(i => i.length > 0);

  if (normalizedCandidate.length === 0 || normalizedJob.length === 0) {
    return 0;
  }

  // Find intersection of industries
  const candidateSet = new Set(normalizedCandidate);
  const jobSet = new Set(normalizedJob);
  const intersection = normalizedCandidate.filter(ind => jobSet.has(ind));

  // If there's ANY intersection, return 100
  if (intersection.length > 0) {
    return 100;
  }

  // If no intersection, return 0
  return 0;
}

/**
 * Calculate industries match score using cached embeddings (deprecated - kept for backward compatibility)
 * This version uses pre-computed embeddings from database instead of generating them on-the-fly
 */
export function calculateIndustriesMatchScoreWithEmbeddings(
  candidateIndustries: string[] | string | null | undefined,
  candidateIndustriesEmbedding: number[] | null,
  jobIndustries: string[] | string | null | undefined,
  jobIndustriesEmbedding: number[] | null
): number {
  // Convert to arrays if needed
  const candidateArray = Array.isArray(candidateIndustries) 
    ? candidateIndustries 
    : (typeof candidateIndustries === 'string' ? [candidateIndustries] : []);
  const jobArray = Array.isArray(jobIndustries) 
    ? jobIndustries 
    : (typeof jobIndustries === 'string' ? [jobIndustries] : []);

  // If either list is empty, return 0
  if (!candidateArray || candidateArray.length === 0) {
    return 0;
  }
  if (!jobArray || jobArray.length === 0) {
    return 0;
  }

  // Normalize industries
  const normalizedCandidate = candidateArray.map(i => String(i).trim().toLowerCase()).filter(i => i.length > 0);
  const normalizedJob = jobArray.map(i => String(i).trim().toLowerCase()).filter(i => i.length > 0);

  if (normalizedCandidate.length === 0 || normalizedJob.length === 0) {
    return 0;
  }

  // 1. Calculate exact match score (intersection)
  const candidateSet = new Set(normalizedCandidate);
  const jobSet = new Set(normalizedJob);
  
  const intersection = normalizedCandidate.filter(ind => jobSet.has(ind));
  const intersectionCount = new Set(intersection).size;
  
  const candidateMatchRatio = intersectionCount / normalizedCandidate.length;
  const jobMatchRatio = intersectionCount / normalizedJob.length;
  const intersectionScore = (candidateMatchRatio + jobMatchRatio) / 2;

  // 2. Calculate semantic similarity using pre-computed embeddings
  let semanticScore = 0;
  
  if (candidateIndustriesEmbedding && jobIndustriesEmbedding) {
    try {
      semanticScore = semanticSimilarity(candidateIndustriesEmbedding, jobIndustriesEmbedding);
    } catch (error) {
      console.error('Error calculating semantic similarity for industries embeddings:', error);
      semanticScore = 0;
    }
  }

  // 3. Combine both scores with weights
  // Intersection: 40% weight
  // Semantic similarity: 60% weight
  const hybridScore = (intersectionScore * 0.4) + (semanticScore * 0.6);

  // Convert to 0-100 scale
  return hybridScore * 100;
}
