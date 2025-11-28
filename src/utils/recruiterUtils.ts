/**
 * Utility functions for managing recruiter identity
 * Uses localStorage to persist recruiter ID across sessions
 */

const RECRUITER_ID_KEY = 'gooffer_recruiter_id';

/**
 * Gets the current recruiter ID from localStorage
 * If no ID exists, generates a new one and stores it
 */
export const getRecruiterId = (): string => {
  let recruiterId = localStorage.getItem(RECRUITER_ID_KEY);
  
  if (!recruiterId) {
    // Generate a unique ID (UUID-like format)
    recruiterId = `recruiter_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(RECRUITER_ID_KEY, recruiterId);
  }
  
  return recruiterId;
};

/**
 * Sets a specific recruiter ID (useful for testing or switching accounts)
 */
export const setRecruiterId = (id: string): void => {
  localStorage.setItem(RECRUITER_ID_KEY, id);
};

/**
 * Clears the recruiter ID (for logout functionality)
 */
export const clearRecruiterId = (): void => {
  localStorage.removeItem(RECRUITER_ID_KEY);
};


