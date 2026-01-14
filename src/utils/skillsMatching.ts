/**
 * Calculate skills match score based on intersection percentage
 * Returns the percentage of job skills that are covered by candidate skills (0-100)
 * 
 * Example:
 * - Job skills: ["javascript", "react", "sql", "python"]
 * - Candidate skills: ["javascript", "react"]
 * - Result: 50% (2 out of 4 skills match)
 */
export function calculateSkillsMatchScore(
  jobSkills: string[] | string | null | undefined,
  candidateSkills: string[] | string | null | undefined
): number {
  // Convert to arrays if needed
  const jobArray = Array.isArray(jobSkills) 
    ? jobSkills 
    : (typeof jobSkills === 'string' ? [jobSkills] : []);
  const candidateArray = Array.isArray(candidateSkills) 
    ? candidateSkills 
    : (typeof candidateSkills === 'string' ? [candidateSkills] : []);

  // If job has no skills, return 0
  if (!jobArray || jobArray.length === 0) {
    return 0;
  }

  // If candidate has no skills, return 0
  if (!candidateArray || candidateArray.length === 0) {
    return 0;
  }

  // Normalize skills (lowercase, trim)
  const normalizedJob = jobArray
    .map(s => String(s).trim().toLowerCase())
    .filter(s => s.length > 0);
  
  const normalizedCandidate = candidateArray
    .map(s => String(s).trim().toLowerCase())
    .filter(s => s.length > 0);

  if (normalizedJob.length === 0) {
    return 0;
  }

  // Create sets for efficient lookup
  const candidateSet = new Set(normalizedCandidate);

  // Count how many job skills are covered by candidate skills
  const matchingSkills = normalizedJob.filter(skill => candidateSet.has(skill));

  // Calculate percentage: (matching skills / total job skills) * 100
  const percentage = (matchingSkills.length / normalizedJob.length) * 100;

  // Round to 2 decimal places
  return Math.round(percentage * 100) / 100;
}


