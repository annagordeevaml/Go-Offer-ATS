/**
 * Calculate Levenshtein distance between two strings
 * Returns a similarity score between 0 and 1
 */
export function calculateStringSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return 1.0;
  if (s1.length === 0 || s2.length === 0) return 0.0;

  const matrix: number[][] = [];

  for (let i = 0; i <= s2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= s1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= s2.length; i++) {
    for (let j = 1; j <= s1.length; j++) {
      if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  return 1 - distance / maxLength;
}

/**
 * Check if two locations are on the same continent
 * Simple heuristic based on common continent patterns
 */
export function areLocationsSameContinent(loc1: string, loc2: string): boolean {
  const l1 = loc1.toLowerCase();
  const l2 = loc2.toLowerCase();

  // North America
  const na = ['usa', 'united states', 'canada', 'mexico', 'us', 'ca', 'mx'];
  if (na.some(c => l1.includes(c)) && na.some(c => l2.includes(c))) return true;

  // Europe
  const eu = ['uk', 'united kingdom', 'germany', 'france', 'spain', 'italy', 'netherlands', 'poland', 'sweden', 'norway', 'denmark', 'finland'];
  if (eu.some(c => l1.includes(c)) && eu.some(c => l2.includes(c))) return true;

  // Asia
  const asia = ['india', 'china', 'japan', 'singapore', 'south korea', 'korea', 'thailand', 'vietnam', 'philippines'];
  if (asia.some(c => l1.includes(c)) && asia.some(c => l2.includes(c))) return true;

  // Remote locations are considered same continent
  if (l1.includes('remote') || l2.includes('remote')) return true;

  return false;
}

/**
 * Calculate skill match percentage
 * Returns percentage of vacancy skills that match candidate skills
 */
export function calculateSkillMatchPercentage(
  vacancySkills: string[],
  candidateSkills: string[]
): number {
  if (!vacancySkills || vacancySkills.length === 0) return 1.0;
  if (!candidateSkills || candidateSkills.length === 0) return 0.0;

  const vacancySkillsLower = vacancySkills.map(s => s.toLowerCase().trim());
  const candidateSkillsLower = candidateSkills.map(s => s.toLowerCase().trim());

  let matches = 0;
  for (const skill of vacancySkillsLower) {
    if (candidateSkillsLower.some(cs => cs.includes(skill) || skill.includes(cs))) {
      matches++;
    }
  }

  return matches / vacancySkills.length;
}

/**
 * Check if industry is a broader subtype match
 * e.g., EdTech vs SaaS, FinTech vs Banking
 */
export function areIndustriesRelated(industry1: string, industry2: string): boolean {
  const i1 = industry1.toLowerCase().trim();
  const i2 = industry2.toLowerCase().trim();

  if (i1 === i2) return true;

  // Tech-related industries
  const techIndustries = ['edtech', 'fintech', 'healthtech', 'medtech', 'saas', 'software', 'tech'];
  if (techIndustries.some(t => i1.includes(t)) && techIndustries.some(t => i2.includes(t))) {
    return true;
  }

  // Financial industries
  const financeIndustries = ['fintech', 'banking', 'financial services', 'finance', 'insurance'];
  if (financeIndustries.some(f => i1.includes(f)) && financeIndustries.some(f => i2.includes(f))) {
    return true;
  }

  // Healthcare industries
  const healthIndustries = ['healthtech', 'medtech', 'healthcare', 'pharmaceutical', 'pharma', 'biotech'];
  if (healthIndustries.some(h => i1.includes(h)) && healthIndustries.some(h => i2.includes(h))) {
    return true;
  }

  return false;
}

/**
 * Check if titles are similar (weaker match)
 */
export function areTitlesSimilar(title1: string, title2: string): boolean {
  const t1 = title1.toLowerCase().trim();
  const t2 = title2.toLowerCase().trim();

  if (t1 === t2) return true;

  // Check if one title contains the other
  if (t1.includes(t2) || t2.includes(t1)) return true;

  // Check similarity score
  const similarity = calculateStringSimilarity(t1, t2);
  return similarity >= 0.6; // 60% similarity threshold
}
