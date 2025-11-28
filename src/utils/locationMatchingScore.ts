/**
 * Calculate location matching score based on various factors
 * Maximum score: 20 points
 * 
 * Scoring logic:
 * - Exact location match: 20 points
 * - Same city: 18 points
 * - Same state/region: 15 points
 * - Same country: 12 points
 * - Same region (e.g., West Coast): 10 points
 * - Candidate willing to relocate to job location: 15 points
 * - Remote match (both remote): 18 points
 * - Within 5 hours drive (same region): 12 points
 * - Different location, no remote, no relocation: 0 points
 */

export interface LocationMatchFactors {
  exactMatch: boolean;
  sameCity: boolean;
  sameState: boolean;
  sameCountry: boolean;
  sameRegion: boolean;
  candidateWillingToRelocate: boolean;
  bothRemote: boolean;
  jobAcceptsRemote: boolean;
  jobAcceptsRelocation: boolean;
  withinDrivingDistance: boolean; // ~5 hours drive
}

/**
 * Parse location into components
 */
export function parseLocationComponents(location: string): {
  city?: string;
  state?: string;
  country?: string;
  region?: string;
  isRemote: boolean;
} {
  if (!location) {
    return { isRemote: false };
  }

  const locationLower = location.toLowerCase().trim();

  // Check if remote
  if (locationLower.includes('remote') || locationLower.includes('anywhere')) {
    return { isRemote: true };
  }

  // Parse format: "city, state, country" or "state, country" or "country"
  const parts = locationLower.split(',').map(p => p.trim());
  
  let city: string | undefined;
  let state: string | undefined;
  let country: string | undefined;
  let region: string | undefined;

  if (parts.length >= 3) {
    // Format: "city, state, country"
    city = parts[0];
    state = parts[1];
    country = parts[2];
  } else if (parts.length === 2) {
    // Could be "city, state" or "state, country"
    // Try to determine by checking if second part is a known country
    const knownCountries = ['usa', 'uk', 'germany', 'france', 'spain', 'italy', 'canada', 'australia', 'india', 'china', 'japan'];
    if (knownCountries.includes(parts[1])) {
      // Format: "state, country"
      state = parts[0];
      country = parts[1];
    } else {
      // Format: "city, state" (assume USA)
      city = parts[0];
      state = parts[1];
      country = 'usa';
    }
  } else if (parts.length === 1) {
    // Could be country, state, or region
    const knownCountries = ['usa', 'uk', 'germany', 'france', 'spain', 'italy', 'canada', 'australia', 'india', 'china', 'japan'];
    if (knownCountries.includes(parts[0])) {
      country = parts[0];
    } else if (parts[0].includes('coast') || parts[0].includes('region') || parts[0].includes('east') || parts[0].includes('west') || parts[0].includes('north') || parts[0].includes('south')) {
      region = parts[0];
    } else {
      // Assume it's a state (for USA)
      state = parts[0];
      country = 'usa';
    }
  }

  return { city, state, country, region, isRemote: false };
}

/**
 * Check if two locations are within driving distance (~5 hours)
 * This is a simplified check based on region/state
 */
function areWithinDrivingDistance(
  loc1: ReturnType<typeof parseLocationComponents>,
  loc2: ReturnType<typeof parseLocationComponents>
): boolean {
  // Same state = within driving distance
  if (loc1.state && loc2.state && loc1.state === loc2.state && loc1.country === loc2.country) {
    return true;
  }

  // Same region (e.g., both West Coast)
  if (loc1.region && loc2.region && loc1.region === loc2.region) {
    return true;
  }

  // Adjacent states in USA (simplified)
  const adjacentStates: { [key: string]: string[] } = {
    'california': ['oregon', 'nevada', 'arizona'],
    'new york': ['new jersey', 'pennsylvania', 'connecticut', 'massachusetts'],
    'texas': ['oklahoma', 'louisiana', 'arkansas', 'new mexico'],
    // Add more as needed
  };

  if (loc1.state && loc2.state && loc1.country === 'usa' && loc2.country === 'usa') {
    const adj1 = adjacentStates[loc1.state] || [];
    const adj2 = adjacentStates[loc2.state] || [];
    if (adj1.includes(loc2.state) || adj2.includes(loc1.state)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate location matching score (0-20)
 */
export function calculateLocationMatchingScore(
  candidateLocation: string,
  candidateWillingToRelocate: boolean,
  candidateRelocationLocations: string[],
  jobLocation: string,
  jobAcceptsRemote: boolean,
  jobAcceptsRelocation: boolean
): { score: number; factors: LocationMatchFactors } {
  // Parse locations
  const candidateLoc = parseLocationComponents(candidateLocation);
  const jobLoc = parseLocationComponents(jobLocation);

  const factors: LocationMatchFactors = {
    exactMatch: false,
    sameCity: false,
    sameState: false,
    sameCountry: false,
    sameRegion: false,
    candidateWillingToRelocate: false,
    bothRemote: false,
    jobAcceptsRemote: false,
    jobAcceptsRelocation: false,
    withinDrivingDistance: false,
  };

  // Check remote scenarios
  if (candidateLoc.isRemote && jobLoc.isRemote) {
    factors.bothRemote = true;
    return { score: 18, factors };
  }

  if (candidateLoc.isRemote && jobAcceptsRemote) {
    factors.candidateWillingToRelocate = true;
    factors.jobAcceptsRemote = true;
    return { score: 18, factors };
  }

  if (jobLoc.isRemote) {
    factors.jobAcceptsRemote = true;
    return { score: 18, factors };
  }

  // If job doesn't accept remote and candidate is remote-only, low score
  if (candidateLoc.isRemote && !jobAcceptsRemote) {
    return { score: 2, factors };
  }

  // Check exact match
  if (candidateLocation.toLowerCase().trim() === jobLocation.toLowerCase().trim()) {
    factors.exactMatch = true;
    return { score: 20, factors };
  }

  // Check if candidate is willing to relocate to job location
  if (candidateWillingToRelocate && jobAcceptsRelocation) {
    // Check if job location is in candidate's relocation list
    const jobLocLower = jobLocation.toLowerCase().trim();
    const matchesRelocationList = candidateRelocationLocations.some(reloc => {
      const relocLower = reloc.toLowerCase().trim();
      return jobLocLower.includes(relocLower) || relocLower.includes(jobLocLower);
    });

    if (matchesRelocationList || candidateRelocationLocations.length === 0) {
      factors.candidateWillingToRelocate = true;
      factors.jobAcceptsRelocation = true;
      return { score: 15, factors };
    }
  }

  // Check same city
  if (candidateLoc.city && jobLoc.city && candidateLoc.city === jobLoc.city && candidateLoc.country === jobLoc.country) {
    factors.sameCity = true;
    return { score: 18, factors };
  }

  // Check same state
  if (candidateLoc.state && jobLoc.state && candidateLoc.state === jobLoc.state && candidateLoc.country === jobLoc.country) {
    factors.sameState = true;
    factors.withinDrivingDistance = areWithinDrivingDistance(candidateLoc, jobLoc);
    return { score: factors.withinDrivingDistance ? 15 : 12, factors };
  }

  // Check same country
  if (candidateLoc.country && jobLoc.country && candidateLoc.country === jobLoc.country) {
    factors.sameCountry = true;
    factors.withinDrivingDistance = areWithinDrivingDistance(candidateLoc, jobLoc);
    if (factors.withinDrivingDistance) {
      return { score: 12, factors };
    }
    return { score: 8, factors };
  }

  // Check same region
  if (candidateLoc.region && jobLoc.region && candidateLoc.region === jobLoc.region) {
    factors.sameRegion = true;
    return { score: 10, factors };
  }

  // Check within driving distance
  if (areWithinDrivingDistance(candidateLoc, jobLoc)) {
    factors.withinDrivingDistance = true;
    return { score: 12, factors };
  }

  // If job doesn't accept remote and doesn't accept relocation, and locations don't match
  if (!jobAcceptsRemote && !jobAcceptsRelocation) {
    return { score: 0, factors };
  }

  // Default: some points for being in the same general area
  if (candidateLoc.country && jobLoc.country) {
    return { score: 3, factors };
  }

  return { score: 0, factors };
}


