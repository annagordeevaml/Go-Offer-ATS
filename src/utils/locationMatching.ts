/**
 * Extract country and region from location string
 * Examples:
 * - "New York, NY, USA" -> { country: "USA", region: "North America" }
 * - "London, UK" -> { country: "UK", region: "Europe" }
 * - "Remote" -> { country: null, region: null, isRemote: true }
 */
export function parseLocation(location: string): {
  country: string | null;
  region: string | null;
  isRemote: boolean;
} {
  if (!location) {
    return { country: null, region: null, isRemote: false };
  }

  const locationLower = location.toLowerCase().trim();

  // Check if remote
  if (locationLower.includes('remote') || locationLower.includes('anywhere')) {
    return { country: null, region: null, isRemote: true };
  }

  // Common country mappings
  const countryMappings: { [key: string]: string } = {
    'usa': 'USA',
    'united states': 'USA',
    'us': 'USA',
    'uk': 'UK',
    'united kingdom': 'UK',
    'canada': 'Canada',
    'germany': 'Germany',
    'france': 'France',
    'spain': 'Spain',
    'italy': 'Italy',
    'netherlands': 'Netherlands',
    'poland': 'Poland',
    'sweden': 'Sweden',
    'norway': 'Norway',
    'denmark': 'Denmark',
    'switzerland': 'Switzerland',
    'australia': 'Australia',
    'india': 'India',
    'china': 'China',
    'japan': 'Japan',
    'singapore': 'Singapore',
    'brazil': 'Brazil',
    'mexico': 'Mexico',
    'argentina': 'Argentina',
  };

  // Common region mappings
  const regionMappings: { [key: string]: string } = {
    'usa': 'North America',
    'canada': 'North America',
    'mexico': 'North America',
    'uk': 'Europe',
    'germany': 'Europe',
    'france': 'Europe',
    'spain': 'Europe',
    'italy': 'Europe',
    'netherlands': 'Europe',
    'poland': 'Europe',
    'sweden': 'Europe',
    'norway': 'Europe',
    'denmark': 'Europe',
    'switzerland': 'Europe',
    'australia': 'Oceania',
    'india': 'Asia',
    'china': 'Asia',
    'japan': 'Asia',
    'singapore': 'Asia',
    'brazil': 'South America',
    'argentina': 'South America',
  };

  // Try to extract country from location string
  let country: string | null = null;
  let region: string | null = null;

  // Check for country in location string
  for (const [key, value] of Object.entries(countryMappings)) {
    if (locationLower.includes(key)) {
      country = value;
      region = regionMappings[key] || null;
      break;
    }
  }

  // If no country found, try to extract from common patterns
  if (!country) {
    // Pattern: "City, State, Country" or "City, Country"
    const parts = location.split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const lastPart = parts[parts.length - 1].toLowerCase();
      for (const [key, value] of Object.entries(countryMappings)) {
        if (lastPart === key || lastPart.includes(key)) {
          country = value;
          region = regionMappings[key] || null;
          break;
        }
      }
    }
  }

  return { country, region, isRemote: false };
}

/**
 * Calculate location score based on job location and candidate location/relocation willingness
 * 
 * Logic:
 * - If job_location = "Remote" → location_score = 1.0
 * - Else if job_location_country == candidate_country → location_score = 1.0
 * - Else if job_location_region == candidate_region → location_score = 0.7
 * - Else if candidate_willing_to_relocate == true → location_score = 0.5
 * - Else → location_score = 0.0
 */
export function calculateLocationScore(
  jobLocation: string,
  candidateLocation: string,
  candidateWillingToRelocate: boolean
): number {
  if (!jobLocation) {
    return 0.0;
  }

  const job = parseLocation(jobLocation);
  const candidate = parseLocation(candidateLocation);

  // If job is remote, score is always 1.0
  if (job.isRemote || jobLocation.toLowerCase().trim() === 'remote') {
    return 1.0;
  }

  // If candidate location matches job location exactly
  if (jobLocation.toLowerCase().trim() === candidateLocation.toLowerCase().trim()) {
    return 1.0;
  }

  // If countries match
  if (job.country && candidate.country && job.country === candidate.country) {
    return 1.0;
  }

  // If regions match
  if (job.region && candidate.region && job.region === candidate.region) {
    return 0.7;
  }

  // If candidate is willing to relocate
  if (candidateWillingToRelocate) {
    return 0.5;
  }

  // No match
  return 0.0;
}

