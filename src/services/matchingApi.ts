import { supabase } from '../lib/supabaseClient';

export interface Vacancy {
  id: string;
  title: string;
  location: string;
  created_at: string;
}

export interface CandidateMatchResult {
  candidate_id: string;
  pre_score: number;
  neural_rank_score: number;
  llm_score: number;
  final_score: number;
  explanation: string;
}

export interface CandidateMatchDetails {
  candidate_id: string;
  full_name: string;
  general_title: string;
  location: string;
  resume_text: string;
  pre_score: number;
  neural_rank_score: number;
  llm_score: number;
  final_score: number;
  explanation: string;
}

/**
 * Fetch all vacancies for matching
 * Note: The matching engine uses the 'vacancies' table, not 'jobs'
 */
export async function fetchVacancies(): Promise<Vacancy[]> {
  const { data, error } = await supabase
    .from('vacancies')
    .select('id, title, location, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching vacancies:', error);
    throw new Error(`Failed to fetch vacancies: ${error.message}`);
  }

  return (data || []).map(vacancy => ({
    id: vacancy.id,
    title: vacancy.title || 'Untitled',
    location: vacancy.location || 'N/A',
    created_at: vacancy.created_at || new Date().toISOString(),
  }));
}

/**
 * Call the /match API endpoint to get ranked candidates
 */
export async function findMatches(vacancyId: string): Promise<CandidateMatchResult[]> {
  try {
    // Get Supabase URL and anon key from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hyoqcxaielpvmmuanogv.supabase.co';
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh5b3FjeGFpZWxwdm1tdWFub2d2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwMTA1MjksImV4cCI6MjA3OTU4NjUyOX0.b7pZ1ez-8xS7BIHHnXBehPpKxob8AAHvxqLBW8lQRR8';

    // Get current session for auth token
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token || supabaseAnonKey;

    // Call the Edge Function
    const response = await fetch(`${supabaseUrl}/functions/v1/match`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`,
      },
      body: JSON.stringify({ vacancy_id: vacancyId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Match API error:', response.status, errorText);
      throw new Error(`Failed to find matches: ${response.status} ${errorText}`);
    }

    const data: CandidateMatchResult[] = await response.json();
    return data;
  } catch (error) {
    console.error('Error finding matches:', error);
    throw error;
  }
}

/**
 * Fetch candidate details by ID
 */
export async function fetchCandidateDetails(candidateId: string): Promise<CandidateMatchDetails | null> {
  const { data, error } = await supabase
    .from('candidates')
    .select('id, full_name, general_title, location, resume_text')
    .eq('id', candidateId)
    .single();

  if (error) {
    console.error('Error fetching candidate details:', error);
    return null;
  }

  return data as CandidateMatchDetails;
}

