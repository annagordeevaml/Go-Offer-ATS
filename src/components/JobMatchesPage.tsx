import React, { useState, useEffect } from 'react';
import { X, MapPin, Check, Filter, Users, Briefcase } from 'lucide-react';
import { Candidate, Job } from '../types';
import { supabase } from '../lib/supabaseClient';
import CandidateCard from './CandidateCard';
import Header from './Header';
import { calculateLocationScore } from '../utils/locationMatching';
import { calculateTitleScore } from '../utils/vectorSimilarity';
import { calculateLocationMatchingScore } from '../utils/locationMatchingScore';

interface JobMatchesPageProps {
  job: Job;
  onBack: () => void;
}

interface CandidateWithLocationScore extends Candidate {
  locationScore?: number; // Old location score (0-1)
  titleScore?: number; // Title matching score (0-20)
  locationMatchScore?: number; // New location matching score (0-20)
}

const JobMatchesPage: React.FC<JobMatchesPageProps> = ({ job, onBack }) => {
  const [candidates, setCandidates] = useState<CandidateWithLocationScore[]>([]);
  const [filteredCandidates, setFilteredCandidates] = useState<CandidateWithLocationScore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter states
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [selectedIndustries, setSelectedIndustries] = useState<Set<string>>(new Set());
  const [showRemoteOnly, setShowRemoteOnly] = useState(false);
  const [showRelocationReady, setShowRelocationReady] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(true);

  // Load candidates and filter by unified titles when component mounts
  useEffect(() => {
    loadMatchingCandidates();
  }, [job]);

  const loadMatchingCandidates = async () => {
    setIsLoading(true);
    try {
      // Get job data from database (including title_embedding, considering_relocation, and accepts_remote_candidates)
      let jobData: any = null;
      try {
        const { data, error } = await supabase
          .from('jobs')
          .select('title_embedding, considering_relocation, accepts_remote_candidates, workplace_type')
          .eq('id', job.id)
          .single();
        if (!error) {
          jobData = data;
        }
      } catch (e) {
        console.warn('Could not fetch job data:', e);
      }

      // Supabase returns vector as array, but we need to ensure it's a number array
      let jobTitleEmbedding: number[] | null = null;
      if (jobData?.title_embedding) {
        if (Array.isArray(jobData.title_embedding)) {
          jobTitleEmbedding = jobData.title_embedding;
        } else if (typeof jobData.title_embedding === 'string') {
          // If it's a string, try to parse it
          try {
            jobTitleEmbedding = JSON.parse(jobData.title_embedding);
          } catch (e) {
            console.warn('Failed to parse job title embedding:', e);
          }
        }
      }
      console.log('Job title embedding loaded:', jobTitleEmbedding ? `Vector of length ${jobTitleEmbedding.length}` : 'Not found');

      // Load all candidates from Supabase (including job_title_embedding)
      const { data: candidatesData, error } = await supabase
        .from('candidates')
        .select('*');

      if (error) {
        console.error('Error loading candidates:', error);
        setIsLoading(false);
        return;
      }

      if (!candidatesData) {
        setIsLoading(false);
        return;
      }

      // Map Supabase data to Candidate format and calculate location scores
      const mappedCandidates: CandidateWithLocationScore[] = await Promise.all(
        candidatesData.map(async (item: any) => {
          // Load unified titles from relationship table if not in main table
          let unifiedTitles: string[] = item.unified_titles || [];
          if (!unifiedTitles || unifiedTitles.length === 0) {
            const { data: titlesData } = await supabase
              .from('candidate_unified_titles')
              .select('unified_title')
              .eq('candidate_id', item.id);
            unifiedTitles = titlesData?.map(t => t.unified_title) || [];
          }

          // Calculate new location matching score (0-20)
          const isJobRemote = job.workplaceType === 'Remote' || 
                             job.location?.toLowerCase().includes('remote') ||
                             job.locations?.some(loc => loc.toLowerCase().includes('remote'));
          
          const jobLocation = job.location || job.locations?.[0] || '';
          const candidateLocation = item.location || '';
          const candidateWillingToRelocate = (item.ready_to_relocate_to && item.ready_to_relocate_to.length > 0) || false;
          const candidateRelocationLocations = item.ready_to_relocate_to || [];
          
          // Get job's considering_relocation and accepts_remote_candidates from database if available
          const jobAcceptsRelocation = jobData?.considering_relocation !== undefined 
            ? jobData.considering_relocation 
            : (job.consideringRelocation !== undefined ? job.consideringRelocation : true); // Default to true
          
          const jobAcceptsRemote = jobData?.accepts_remote_candidates !== undefined
            ? jobData.accepts_remote_candidates
            : (job.acceptsRemoteCandidates !== undefined ? job.acceptsRemoteCandidates : isJobRemote); // Default based on workplace type
          
          const locationMatchResult = calculateLocationMatchingScore(
            candidateLocation,
            candidateWillingToRelocate,
            candidateRelocationLocations,
            jobLocation,
            jobAcceptsRemote,
            jobAcceptsRelocation
          );
          
          const locationMatchScore = locationMatchResult.score;
          
          // Always log for debugging
          console.log(`[Location Match] Candidate ${item.id || item.name}:`, {
            locationMatchScore,
            candidateLocation: candidateLocation || '(empty)',
            jobLocation: jobLocation || '(empty)',
            isJobRemote,
            candidateWillingToRelocate,
            jobAcceptsRelocation,
            factors: locationMatchResult.factors
          });
          
          // Keep old location score for backward compatibility
          const locationScore = calculateLocationScore(
            isJobRemote ? 'Remote' : jobLocation,
            candidateLocation,
            candidateWillingToRelocate
          );

          // Calculate title score
          // Supabase returns vector as array, but we need to ensure it's a number array
          let candidateTitleEmbedding: number[] | null = null;
          if (item.job_title_embedding) {
            if (Array.isArray(item.job_title_embedding)) {
              candidateTitleEmbedding = item.job_title_embedding;
            } else if (typeof item.job_title_embedding === 'string') {
              // If it's a string, try to parse it
              try {
                candidateTitleEmbedding = JSON.parse(item.job_title_embedding);
              } catch (e) {
                console.warn(`Failed to parse candidate ${item.id} title embedding:`, e);
              }
            }
          }
          const titleScore = calculateTitleScore(candidateTitleEmbedding, jobTitleEmbedding);

          return {
            id: item.id,
            name: item.full_name || item.name || 'Unknown',
            jobTitle: item.general_title || item.job_title || '',
            location: item.location || '',
            experience: item.experience || '',
            availability: item.availability || '',
            readyToRelocateTo: item.ready_to_relocate_to || [],
            lastUpdated: item.last_updated || '',
            matchScore: titleScore, // Use title score as match score
            status: item.status as 'actively_looking' | 'open_to_offers',
            industries: item.industries || [],
            relatedIndustries: item.related_industries || [],
            companyNames: item.company_names || [],
            skills: item.skills || [],
            summary: item.summary || '',
            socialLinks: item.social_links || {},
            calendly: item.calendly,
            salaryMin: item.salary_min,
            salaryMax: item.salary_max,
            salaryUnit: item.salary_unit || 'year',
            unifiedTitles: unifiedTitles,
            locationScore: locationScore, // Old location score (0-1) for backward compatibility
            locationMatchScore: locationMatchScore, // New location matching score (0-20)
            titleScore: titleScore, // Title matching score (0-20)
            resume: item.resume_data ? {
              file: null,
              htmlContent: item.resume_data.html_content || '',
              contacts: item.resume_data.contacts || {},
            } : undefined,
          };
        })
      );

      // Filter candidates by unified titles match
      const jobUnifiedTitles = job.unifiedTitles || [];
      const matchingCandidates = mappedCandidates.filter(candidate => {
        if (!candidate.unifiedTitles || candidate.unifiedTitles.length === 0) return false;
        if (jobUnifiedTitles.length === 0) return true; // If job has no unified titles, show all
        
        // Check if candidate has at least one matching unified title
        return candidate.unifiedTitles.some(title => jobUnifiedTitles.includes(title));
      });

      // Sort candidates by title score (descending), then by location match score
      const sortedCandidates = matchingCandidates.sort((a, b) => {
        const titleScoreA = a.titleScore ?? 0;
        const titleScoreB = b.titleScore ?? 0;
        if (titleScoreB !== titleScoreA) {
          return titleScoreB - titleScoreA;
        }
        // If title scores are equal, sort by location match score
        const locationMatchScoreA = a.locationMatchScore ?? 0;
        const locationMatchScoreB = b.locationMatchScore ?? 0;
        return locationMatchScoreB - locationMatchScoreA;
      });

      setCandidates(sortedCandidates);
      setFilteredCandidates(sortedCandidates);
    } catch (error) {
      console.error('Error loading matching candidates:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Get unique locations from candidates
  const uniqueLocations = Array.from(
    new Set(candidates.map(c => c.location).filter(Boolean))
  ).sort();

  // Get unique industries from candidates
  const uniqueIndustries = Array.from(
    new Set(
      candidates.flatMap(c => c.industries || []).filter(Boolean)
    )
  ).sort();

  // Apply filters
  useEffect(() => {
    let filtered = [...candidates];

    // Location filter
    if (selectedLocations.size > 0) {
      filtered = filtered.filter(c => selectedLocations.has(c.location));
    }

    // Industry filter - show candidates with at least one selected industry
    if (selectedIndustries.size > 0) {
      filtered = filtered.filter(c => {
        const candidateIndustries = c.industries || [];
        // Check if candidate has at least one industry that matches selected industries
        return candidateIndustries.some(industry => selectedIndustries.has(industry));
      });
    }

    // Remote only
    if (showRemoteOnly) {
      filtered = filtered.filter(c => 
        c.location.toLowerCase().includes('remote') || 
        c.location.toLowerCase().includes('anywhere')
      );
    }

    // Relocation ready
    if (showRelocationReady) {
      filtered = filtered.filter(c => 
        c.readyToRelocateTo && c.readyToRelocateTo.length > 0
      );
    }

    setFilteredCandidates(filtered);
  }, [selectedLocations, selectedIndustries, showRemoteOnly, showRelocationReady, candidates]);

  const toggleLocation = (location: string) => {
    const newSelected = new Set(selectedLocations);
    if (newSelected.has(location)) {
      newSelected.delete(location);
    } else {
      newSelected.add(location);
    }
    setSelectedLocations(newSelected);
  };

  const toggleIndustry = (industry: string) => {
    const newSelected = new Set(selectedIndustries);
    if (newSelected.has(industry)) {
      newSelected.delete(industry);
    } else {
      newSelected.add(industry);
    }
    setSelectedIndustries(newSelected);
  };

  const clearFilters = () => {
    setSelectedLocations(new Set());
    setSelectedIndustries(new Set());
    setShowRemoteOnly(false);
    setShowRelocationReady(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8E9EB] via-[#E0E2E5] to-[#E8E9EB]">
      <Header activePage="My Jobs" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="text-[#7C3AED] hover:text-[#06B6D4] mb-2 flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Back to Jobs
            </button>
            <h1 className="text-3xl font-bold text-gray-900">
              Matches for: <span className="text-[#7C3AED]">{job.title}</span>
            </h1>
            <p className="text-gray-600 mt-1">
              {filteredCandidates.length} candidate{filteredCandidates.length !== 1 ? 's' : ''} found
            </p>
            {job.unifiedTitles && job.unifiedTitles.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                Matching by: {job.unifiedTitles.join(', ')}
              </p>
            )}
          </div>
          <button
            onClick={loadMatchingCandidates}
            className="px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg font-semibold hover:opacity-90 flex items-center gap-2"
          >
            <Briefcase className="w-5 h-5" />
            Refresh Matches
          </button>
        </div>

        <div className="flex gap-6">
          {/* Left Sidebar - Filters (LinkedIn Recruiter style) */}
          <div className={`w-80 flex-shrink-0 transition-all duration-300 ${isFiltersOpen ? '' : 'hidden'}`}>
            <div className="bg-white rounded-xl shadow-lg p-6 sticky top-24">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-[#7C3AED]" />
                  Filters
                </h2>
                <button
                  onClick={clearFilters}
                  className="text-sm text-[#7C3AED] hover:text-[#06B6D4]"
                >
                  Clear all
                </button>
              </div>

              {/* Location Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Location
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {uniqueLocations.map(location => (
                    <label
                      key={location}
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedLocations.has(location)}
                        onChange={() => toggleLocation(location)}
                        className="w-4 h-4 text-[#7C3AED] border-gray-300 rounded focus:ring-[#7C3AED]"
                      />
                      <span className="text-sm text-gray-700">{location}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Industry Filter */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Briefcase className="w-4 h-4" />
                  Industry
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {uniqueIndustries.length > 0 ? (
                    uniqueIndustries.map(industry => (
                      <label
                        key={industry}
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedIndustries.has(industry)}
                          onChange={() => toggleIndustry(industry)}
                          className="w-4 h-4 text-[#7C3AED] border-gray-300 rounded focus:ring-[#7C3AED]"
                        />
                        <span className="text-sm text-gray-700">{industry}</span>
                      </label>
                    ))
                  ) : (
                    <p className="text-xs text-gray-500 italic">No industries available</p>
                  )}
                </div>
              </div>

              {/* Remote/Relocation Filters */}
              <div className="space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRemoteOnly}
                    onChange={(e) => setShowRemoteOnly(e.target.checked)}
                    className="w-4 h-4 text-[#7C3AED] border-gray-300 rounded focus:ring-[#7C3AED]"
                  />
                  <span className="text-sm font-medium text-gray-700">Remote only</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showRelocationReady}
                    onChange={(e) => setShowRelocationReady(e.target.checked)}
                    className="w-4 h-4 text-[#7C3AED] border-gray-300 rounded focus:ring-[#7C3AED]"
                  />
                  <span className="text-sm font-medium text-gray-700">Ready to relocate</span>
                </label>
              </div>
            </div>
          </div>

          {/* Main Content - Candidate Cards */}
          <div className="flex-1">
            {isLoading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#7C3AED]"></div>
                <p className="mt-4 text-gray-600">Loading candidates...</p>
              </div>
            ) : filteredCandidates.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl shadow-lg">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No candidates found</h3>
                <p className="text-gray-600">Try adjusting your filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6">
                {filteredCandidates.map(candidate => (
                  <CandidateCard
                    key={candidate.id}
                    candidate={candidate}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobMatchesPage;

