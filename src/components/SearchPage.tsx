import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronDown, Filter, Plus, AlertTriangle, X, LogOut, Loader2 } from 'lucide-react';
import Header from './Header';
import HeroSection from './HeroSection';
import CandidateCard from './CandidateCard';
import AddCandidateModal from './AddCandidateModal';
import ChatBot from './ChatBot';
import { Candidate } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import galaxyBg from '../../images/logo/galaxy.jpg';
import { updateAllCandidatesUnifiedTitles } from '../utils/updateAllCandidatesUnifiedTitles';
import { generateCandidateEmbeddings } from '../services/embeddingsService';
import GenerateEmbeddingsButton from './GenerateEmbeddingsButton';
import { normalizeJobTitle, generateJobTitleEmbedding } from '../services/jobTitleNormalization';
import { normalizeAllJobTitles } from '../utils/normalizeAllJobTitles';
import { renormalizeAllJobTitles } from '../utils/renormalizeAllJobTitles';
import { normalizeAllCandidateLocations } from '../utils/normalizeAllLocations';
import { normalizeLocation, generateLocationEmbedding } from '../services/locationNormalization';
import { updateAllCandidateSkills } from '../utils/updateAllCandidateSkills';

interface ExampleCard {
  id: string;
  title: string;
  description: string;
}

interface SearchPageProps {
  onNavigate?: (page: 'Star Catalogue' | 'My Jobs' | 'Analytics') => void;
}

const SearchPage: React.FC<SearchPageProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [isUpdatingTitles, setIsUpdatingTitles] = useState(false);
  const [isNormalizingJobTitles, setIsNormalizingJobTitles] = useState(false);
  const [isNormalizingLocations, setIsNormalizingLocations] = useState(false);
  const [isUpdatingSkills, setIsUpdatingSkills] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{
    show: boolean;
    email: string;
    existingName: string;
    onConfirm: () => void;
    onCancel: () => void;
  } | null>(null);
  const { user } = useAuth();
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  // Load candidates from Supabase on mount
  useEffect(() => {
    const loadCandidates = async () => {
      try {
        const { data, error } = await supabase
          .from('candidates')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error loading candidates:', error);
          return;
        }

        if (data) {
          // Map Supabase data to Candidate format
          const mappedCandidates: Candidate[] = data.map((item: any) => ({
            id: item.id,
            name: item.name,
            jobTitle: item.job_title,
            location: item.location,
            experience: item.experience || '',
            availability: item.availability || '',
            readyToRelocateTo: item.ready_to_relocate_to || [],
            lastUpdated: item.last_updated || '',
            matchScore: item.match_score || 0,
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
            unifiedTitles: item.unified_titles || [], // Load from main table first
            resume: item.resume_data ? {
              file: null as any, // File can't be stored in DB, will need to be re-uploaded
              htmlContent: item.resume_data.html_content || '',
              contacts: item.resume_data.contacts || {},
            } : undefined,
          }));
          
          // Load unified titles from relationship table if not in main table
          const candidatesWithTitles = await Promise.all(
            mappedCandidates.map(async (candidate) => {
              // If unified_titles is empty in main table, load from relationship table
              if (!candidate.unifiedTitles || candidate.unifiedTitles.length === 0) {
                const { data: titlesData } = await supabase
                  .from('candidate_unified_titles')
                  .select('unified_title')
                  .eq('candidate_id', candidate.id);
                
                const titlesFromRelationship = titlesData?.map(t => t.unified_title) || [];
                if (titlesFromRelationship.length > 0) {
                  return {
                    ...candidate,
                    unifiedTitles: titlesFromRelationship,
                  };
                }
              }
              return candidate;
            })
          );
          
          setCandidates(candidatesWithTitles);
        }
      } catch (error) {
        console.error('Error loading candidates:', error);
      }
    };

    loadCandidates();
  }, []);

  // Handle candidate deletion
  const handleDeleteCandidate = async (candidateId: number) => {
    try {
      // Delete from Supabase
      const { error } = await supabase
        .from('candidates')
        .delete()
        .eq('id', candidateId);

      if (error) {
        console.error('Error deleting candidate:', error);
        alert('Failed to delete candidate. Please check if you have permission to delete candidates.');
        return;
      }

      // Update local state
      setCandidates((prev) => prev.filter((c) => c.id !== candidateId));
    } catch (error) {
      console.error('Error deleting candidate:', error);
      alert('An unexpected error occurred while deleting the candidate.');
    }
  };

  const exampleCards: ExampleCard[] = [
    {
      id: '1',
      title: 'DevOps Engineer in Berlin',
      description: '5+ years experience with AWS, Kubernetes',
    },
    {
      id: '2',
      title: 'Senior Product Manager, Remote',
      description: 'B2B SaaS background, US timezone',
    },
    {
      id: '3',
      title: 'Data Scientist with ML experience',
      description: 'Python, TensorFlow, 3+ years',
    },
  ];

  const filterOptions = [
    'Job Title',
    'Location',
    'Visa Status',
    'English Level',
  ];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search query:', searchQuery);
  };

  const handleExampleClick = (title: string) => {
    setSearchQuery(title);
    console.log('Example clicked:', title);
  };

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    console.log('Filter clicked:', filter);
    setTimeout(() => {
      alert(`Filter: ${filter} - Coming soon!`);
      setActiveFilter(null);
    }, 100);
  };

  const handleResumeUpload = (candidateId: number, resumeFile: File, htmlContent: string, contacts: { email?: string; phone?: string; linkedin?: string }) => {
    setCandidates(prev =>
      prev.map(c =>
        c.id === candidateId
          ? {
              ...c,
              resume: {
                file: resumeFile,
                htmlContent: htmlContent,
                contacts: contacts,
              },
            }
          : c
      )
    );
  };

  const handleCandidateUpdate = (updatedCandidate: Candidate) => {
    setCandidates(prev =>
      prev.map(c => (c.id === updatedCandidate.id ? updatedCandidate : c))
    );
  };

  const handleFilters = () => {
    alert('Filters panel coming soon!');
  };

  const handleUpdateAllUnifiedTitles = async () => {
    if (!confirm('This will update unified titles for all candidates using AI. This may take a while and use API credits. Continue?')) {
      return;
    }
    
    setIsUpdatingTitles(true);
    try {
      await updateAllCandidatesUnifiedTitles();
      alert('Update complete! Please refresh the page to see the changes.');
      // Reload candidates
      window.location.reload();
    } catch (error) {
      console.error('Error updating unified titles:', error);
      alert('Error updating unified titles. Check console for details.');
    } finally {
      setIsUpdatingTitles(false);
    }
  };

  const handleNormalizeAllLocations = async () => {
    if (!confirm('This will normalize locations and generate embeddings for ALL candidates in the database. This may take a while and use OpenAI API credits. Continue?')) {
      return;
    }
    
    setIsNormalizingLocations(true);
    try {
      await normalizeAllCandidateLocations();
      alert('Location normalization complete! Check console for details.');
      window.location.reload();
    } catch (error) {
      console.error('Error normalizing locations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error normalizing locations:\n\n${errorMessage}\n\nCheck console for more details.`);
    } finally {
      setIsNormalizingLocations(false);
    }
  };

  const handleUpdateAllSkills = async () => {
    if (!confirm('This will extract and normalize skills from ALL candidate resumes in the database. This may take a while and use OpenAI API credits. Continue?')) {
      return;
    }
    
    setIsUpdatingSkills(true);
    try {
      await updateAllCandidateSkills();
      alert('Skills update complete! Check console for details.');
      window.location.reload();
    } catch (error) {
      console.error('Error updating skills:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error updating skills:\n\n${errorMessage}\n\nCheck console for more details.`);
    } finally {
      setIsUpdatingSkills(false);
    }
  };

  const handleNormalizeAllJobTitles = async () => {
    const shouldRenormalize = confirm(
      'Re-normalize ALL job titles (including already normalized ones)?\n\n' +
      'OK = Re-normalize ALL with improved logic\n' +
      'Cancel = Only normalize new candidates'
    );
    
    if (!confirm('This will normalize job titles and generate embeddings. This may take a while and use OpenAI API credits. Continue?')) {
      return;
    }
    
    setIsNormalizingJobTitles(true);
    try {
      if (shouldRenormalize) {
        await renormalizeAllJobTitles();
        alert('Job title re-normalization complete! All job titles have been updated with improved normalization. Check console for details.');
      } else {
        await normalizeAllJobTitles();
        alert('Job title normalization complete! Check console for details. The page will reload to show updated data.');
      }
      // Reload candidates to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error normalizing job titles:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error normalizing job titles:\n\n${errorMessage}\n\nCheck console for more details.`);
    } finally {
      setIsNormalizingJobTitles(false);
    }
  };

  // Filter candidates based on search query
  const filteredCandidates = searchQuery
    ? candidates.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.industries?.some((ind) => ind.toLowerCase().includes(searchQuery.toLowerCase())) ||
          c.skills?.some((skill) => skill.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : candidates;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8E9EB] via-[#E0E2E5] to-[#E8E9EB] relative overflow-hidden">
      {/* Common background for Header and HeroSection - single continuous image */}
      <div 
        className="hero-gradient-overlay relative w-full"
        style={{
          backgroundImage: `url(${galaxyBg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center top',
          backgroundRepeat: 'no-repeat',
          backgroundAttachment: 'scroll',
          border: 'none',
          outline: 'none',
          boxShadow: 'none',
          filter: 'contrast(1.15) saturate(1.1)',
          WebkitBackfaceVisibility: 'hidden',
          backfaceVisibility: 'hidden',
          transform: 'translateZ(0)',
          willChange: 'transform',
          animation: 'dawn-background 12s ease-in-out infinite',
        }}
      >
        <Header activePage="Star Catalogue" />
        <HeroSection />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16" style={{ borderTop: 'none', outline: 'none', boxShadow: 'none' }}>

        {/* Search Bar */}
        <section className="mb-8">
          <form onSubmit={handleSearch} className="relative">
            <div className="search-bar-container relative flex items-center gap-3 rounded-2xl p-2 focus-within:ring-0 transition-all duration-300">
              <Search className="absolute left-4 text-gray-600 w-5 h-5 z-10" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Product manager with EdTech experience..."
                className="flex-1 pl-12 pr-4 py-4 bg-transparent text-gray-900 placeholder:text-gray-500 focus:outline-none text-lg z-10"
                aria-label="Search for candidates"
              />
              <button
                type="submit"
                className="search-button px-8 py-4 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-semibold rounded-full hover:shadow-[0_0_20px_rgba(124,58,237,0.6)] transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] focus:ring-offset-2 focus:ring-offset-transparent z-10"
              >
                Search
              </button>
            </div>
          </form>
        </section>

        {/* Filter Chips */}
        <section className="mb-8">
          <p className="text-gray-600 text-sm mb-4 text-center">or refine with filters ↓</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {filterOptions.map((filter) => (
              <button
                key={filter}
                onClick={() => handleFilterClick(filter)}
                className={`px-6 py-2 rounded-full border-2 border-[#7C3AED] text-gray-700 font-medium hover:bg-purple-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-transparent ${
                  activeFilter === filter ? 'bg-purple-50 shadow-[0_0_15px_rgba(124,58,237,0.2)]' : ''
                }`}
                aria-label={`Filter by ${filter}`}
              >
                {filter}
                <ChevronDown className="inline-block ml-2 w-4 h-4" aria-hidden="true" />
              </button>
            ))}
            <button
              onClick={() => handleFilterClick('More Filters')}
              className="px-6 py-2 rounded-full border-2 border-[#7C3AED] text-gray-700 font-medium hover:bg-purple-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-transparent"
              aria-label="More filters"
            >
              More Filters
            </button>
          </div>
        </section>

        {/* Empty State / Example Cards */}
        {!searchQuery && (
          <section className="mb-8">
            <p className="text-gray-600 text-center mb-6 text-lg">Try searching:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {exampleCards.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleExampleClick(card.title)}
                  className="bg-white rounded-xl p-6 border border-gray-200 hover:border-[#7C3AED] hover:shadow-lg transition-all duration-300 hover:scale-105 text-left focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-transparent group"
                  aria-label={`Search for ${card.title}`}
                >
                  <h3 className="text-gray-900 font-semibold text-lg mb-2 group-hover:text-[#7C3AED] transition-colors duration-300">
                    {card.title}
                  </h3>
                  <p className="text-gray-600 text-sm">{card.description}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Results Header */}
        <section className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                <span className="bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
                  {filteredCandidates.length}
                </span>{' '}
                <span className="text-gray-600">candidates found</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              {/* Temporary Logout Button - Very Visible - Always Shown */}
              <button
                onClick={async () => {
                  try {
                    const { supabase } = await import('../lib/supabaseClient');
                    await supabase.auth.signOut();
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/';
                  } catch (error) {
                    console.error('Logout error:', error);
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/';
                  }
                }}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-lg transition-colors duration-200 flex items-center gap-2 shadow-xl border-2 border-red-800"
                title="Logout (Temporary - Click to logout)"
                style={{ zIndex: 9999 }}
              >
                <LogOut className="w-5 h-5" />
                <span>LOGOUT</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg hover:opacity-90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Candidate
              </button>
              {user && (
                <>
                  <GenerateEmbeddingsButton 
                    onComplete={() => {
                      // Optionally reload candidates after embeddings are generated
                      window.location.reload();
                    }}
                  />
                  <button
                    onClick={handleNormalizeAllLocations}
                    disabled={isNormalizingLocations}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isNormalizingLocations ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Normalizing...
                      </>
                    ) : (
                      'Normalize All Locations'
                    )}
                  </button>
                  <button
                    onClick={handleUpdateAllSkills}
                    disabled={isUpdatingSkills}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdatingSkills ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update All Skills'
                    )}
                  </button>
                  <button
                    onClick={handleNormalizeAllJobTitles}
                    disabled={isNormalizingJobTitles}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isNormalizingJobTitles ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Normalizing...
                      </>
                    ) : (
                      'Normalize All Job Titles'
                    )}
                  </button>
                  <button
                    onClick={handleUpdateAllUnifiedTitles}
                    disabled={isUpdatingTitles}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdatingTitles ? 'Updating...' : 'Update All Unified Titles'}
                  </button>
                </>
              )}
              <button
                onClick={handleFilters}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#7C3AED] text-[#7C3AED] rounded-lg hover:bg-purple-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              >
                <Filter className="w-4 h-4" />
                Filters
              </button>
            </div>
          </div>
        </section>

        {/* Candidates List */}
        <section>
          <div className="flex flex-col gap-3">
            {filteredCandidates.map((candidate, index) => (
              <motion.div
                key={candidate.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <CandidateCard 
                  candidate={candidate} 
                  onResumeUpload={handleResumeUpload}
                  onCandidateUpdate={handleCandidateUpdate}
                  onEdit={(candidate) => setEditingCandidate(candidate)}
                  onDelete={handleDeleteCandidate}
                />
              </motion.div>
            ))}
          </div>
        </section>
      </main>
      <ChatBot />
      
      {/* Duplicate Warning Modal */}
      {duplicateWarning && duplicateWarning.show && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-400 to-orange-500 p-4 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold text-lg">Duplicate Candidate</h3>
              </div>
              <button
                onClick={() => {
                  duplicateWarning?.onCancel();
                }}
                className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">
                A candidate with email <span className="font-semibold text-[#7C3AED]">"{duplicateWarning.email}"</span> already exists in the database.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                <p className="text-sm text-gray-600 mb-1">Existing candidate:</p>
                <p className="text-lg font-semibold text-gray-900">{duplicateWarning.existingName}</p>
              </div>

              <p className="text-gray-600 text-sm mb-6">
                Do you really want to add a duplicate candidate?
              </p>

              {/* Buttons */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    duplicateWarning?.onCancel();
                  }}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    duplicateWarning?.onConfirm();
                  }}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg font-medium hover:opacity-90 transition-opacity duration-200 shadow-md"
                >
                  Add Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AddCandidateModal
        open={isAddModalOpen || editingCandidate !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCandidate(null);
        }}
        onSave={async (candidate) => {
          try {
            // Normalize job title and generate embedding
            let normalizedJobTitle = '';
            let jobTitleEmbedding: number[] | null = null;
            
            if (candidate.jobTitle && candidate.jobTitle.trim()) {
              try {
                console.log('Normalizing job title:', candidate.jobTitle);
                normalizedJobTitle = await normalizeJobTitle(candidate.jobTitle);
                console.log('Normalized job title:', normalizedJobTitle);
                
                if (normalizedJobTitle) {
                  jobTitleEmbedding = await generateJobTitleEmbedding(normalizedJobTitle);
                  console.log('Job title embedding generated:', jobTitleEmbedding ? 'Success' : 'Failed');
                }
              } catch (normalizationError) {
                console.error('Error normalizing job title:', normalizationError);
                // Continue with original title if normalization fails
                normalizedJobTitle = candidate.jobTitle;
              }
            }
            
            // Normalize skills if they exist and haven't been normalized yet
            let normalizedSkills: string[] = candidate.skills || [];
            if (normalizedSkills.length > 0) {
              try {
                const { normalizeSkills } = await import('../services/skillsNormalization');
                normalizedSkills = await normalizeSkills(normalizedSkills);
                console.log('Normalized skills for new candidate:', normalizedSkills);
              } catch (normalizationError) {
                console.error('Error normalizing skills:', normalizationError);
                // Fallback: basic normalization
                normalizedSkills = normalizedSkills.map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
              }
            }
            
            // Prepare data for Supabase (convert to snake_case)
            const candidateData: any = {
              name: candidate.name,
              job_title: candidate.jobTitle,
              normalized_job_title: normalizedJobTitle || null,
              location: candidate.location,
              experience: candidate.experience || null,
              availability: candidate.availability || null,
              ready_to_relocate_to: candidate.readyToRelocateTo || [],
              last_updated: candidate.lastUpdated || new Date().toISOString().split('T')[0],
              match_score: candidate.matchScore || 0,
              status: candidate.status || 'actively_looking',
              industries: candidate.industries || [],
              related_industries: candidate.relatedIndustries || [],
              company_names: candidate.companyNames || [],
              skills: normalizedSkills, // Use normalized skills
              summary: candidate.summary || null,
              social_links: candidate.socialLinks || {},
              calendly: candidate.calendly || null,
              salary_min: candidate.salaryMin || null,
              salary_max: candidate.salaryMax || null,
              salary_unit: candidate.salaryUnit || 'year',
              unified_titles: candidate.unifiedTitles || [],
              resume_text: candidate.resume?.htmlContent ? 
                // Extract plain text from HTML for embedding
                candidate.resume.htmlContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() 
                : null,
              resume_data: candidate.resume ? {
                html_content: candidate.resume.htmlContent || '',
                contacts: candidate.resume.contacts || {},
              } : null,
              created_by_user_id: user?.id || null,
            };

            if (editingCandidate) {
              // Normalize job title and generate embedding for update
              let normalizedJobTitle = '';
              let jobTitleEmbedding: number[] | null = null;
              
              if (candidate.jobTitle && candidate.jobTitle.trim()) {
                try {
                  console.log('Normalizing job title for update:', candidate.jobTitle);
                  normalizedJobTitle = await normalizeJobTitle(candidate.jobTitle);
                  console.log('Normalized job title:', normalizedJobTitle);
                  
                  if (normalizedJobTitle) {
                    jobTitleEmbedding = await generateJobTitleEmbedding(normalizedJobTitle);
                    console.log('Job title embedding generated:', jobTitleEmbedding ? 'Success' : 'Failed');
                  }
                } catch (normalizationError) {
                  console.error('Error normalizing job title:', normalizationError);
                  normalizedJobTitle = candidate.jobTitle;
                }
              }
              
              // Normalize location and generate embedding for update
              let normalizedLocation = '';
              let locationEmbedding: number[] | null = null;
              
              if (candidate.location && candidate.location.trim()) {
                try {
                  console.log('Normalizing location for update:', candidate.location);
                  normalizedLocation = await normalizeLocation(candidate.location);
                  console.log('Normalized location:', normalizedLocation);
                  
                  if (normalizedLocation) {
                    locationEmbedding = await generateLocationEmbedding(normalizedLocation);
                    console.log('Location embedding generated:', locationEmbedding ? 'Success' : 'Failed');
                  }
                } catch (normalizationError) {
                  console.error('Error normalizing location:', normalizationError);
                  normalizedLocation = candidate.location.toLowerCase().trim();
                }
              }
              
              // Normalize skills for update
              let normalizedSkills: string[] = candidate.skills || [];
              if (normalizedSkills.length > 0) {
                try {
                  const { normalizeSkills } = await import('../services/skillsNormalization');
                  normalizedSkills = await normalizeSkills(normalizedSkills);
                  console.log('Normalized skills for update:', normalizedSkills);
                } catch (normalizationError) {
                  console.error('Error normalizing skills:', normalizationError);
                  // Fallback: basic normalization
                  normalizedSkills = normalizedSkills.map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
                }
              }
              
              // Normalize skills for update
              let normalizedSkillsForUpdate: string[] = candidate.skills || [];
              if (normalizedSkillsForUpdate.length > 0) {
                try {
                  const { normalizeSkills } = await import('../services/skillsNormalization');
                  normalizedSkillsForUpdate = await normalizeSkills(normalizedSkillsForUpdate);
                  console.log('Normalized skills for update:', normalizedSkillsForUpdate);
                } catch (normalizationError) {
                  console.error('Error normalizing skills:', normalizationError);
                  // Fallback: basic normalization
                  normalizedSkillsForUpdate = normalizedSkillsForUpdate.map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
                }
              }
              
              // Update candidateData with normalized fields
              candidateData.normalized_job_title = normalizedJobTitle || null;
              candidateData.normalized_location = normalizedLocation || null;
              candidateData.skills = normalizedSkillsForUpdate; // Use normalized skills
              candidateData.skills = normalizedSkills; // Use normalized skills
              
              // Add embeddings if available (as array for pgvector)
              if (jobTitleEmbedding && jobTitleEmbedding.length > 0) {
                candidateData.job_title_embedding = jobTitleEmbedding;
              }
              if (locationEmbedding && locationEmbedding.length > 0) {
                candidateData.location_embedding = locationEmbedding;
              }
              
              // Update existing candidate in Supabase
              const { data, error } = await supabase
                .from('candidates')
                .update(candidateData)
                .eq('id', editingCandidate.id)
                .select();

              if (error) {
                console.error('Error updating candidate:', error);
                // Check if error is about missing columns
                if (error.message && error.message.includes('salary_unit')) {
                  alert('Database schema needs to be updated. Please run the SQL script from add_salary_unit.sql in Supabase Dashboard to add the salary_unit column.');
                } else if (error.message && error.message.includes('unified_titles')) {
                  alert('Database schema needs to be updated. Please run the SQL script from add_unified_titles_column.sql in Supabase Dashboard to add the unified_titles column.');
                } else {
                  alert('Failed to update candidate. Please try again.');
                }
                return;
              }

              // Update unified titles in both tables
              if (candidate.unifiedTitles !== undefined) {
                // Delete existing unified titles from relationship table
                await supabase
                  .from('candidate_unified_titles')
                  .delete()
                  .eq('candidate_id', editingCandidate.id);
                
                // Insert new unified titles into relationship table
                if (candidate.unifiedTitles.length > 0) {
                  const titlesToInsert = candidate.unifiedTitles.map(title => ({
                    candidate_id: editingCandidate.id,
                    unified_title: title,
                  }));
                  
                  await supabase
                    .from('candidate_unified_titles')
                    .insert(titlesToInsert);
                }
                
                // Also update unified_titles array in candidates table
                try {
                  await supabase
                    .from('candidates')
                    .update({ unified_titles: candidate.unifiedTitles })
                    .eq('id', editingCandidate.id);
                } catch (err) {
                  // If column doesn't exist, silently fail (user needs to run SQL script)
                  console.warn('Could not update unified_titles column:', err);
                }
              }

              // Reload unified titles from database to ensure consistency
              const { data: titlesData } = await supabase
                .from('candidate_unified_titles')
                .select('unified_title')
                .eq('candidate_id', editingCandidate.id);
              
              // Also check main table
              const { data: updatedCandidateData } = await supabase
                .from('candidates')
                .select('unified_titles')
                .eq('id', editingCandidate.id)
                .single();
              
              const finalUnifiedTitles = (updatedCandidateData?.unified_titles && updatedCandidateData.unified_titles.length > 0)
                ? updatedCandidateData.unified_titles
                : (titlesData?.map(t => t.unified_title) || candidate.unifiedTitles || []);

              // Update local state
              if (data && data[0]) {
                const updatedCandidate: Candidate = {
                  ...candidate,
                  id: data[0].id,
                  unifiedTitles: finalUnifiedTitles,
                };
                setCandidates((prev) =>
                  prev.map((c) => (c.id === candidate.id ? updatedCandidate : c))
                );
                
                // Generate embeddings for the updated candidate
                try {
                  await generateCandidateEmbeddings(data[0].id);
                  console.log('Embeddings generated successfully for candidate', data[0].id);
                } catch (embeddingError) {
                  console.error('Error generating embeddings:', embeddingError);
                  // Don't block the save operation if embeddings fail
                }
              }
              setEditingCandidate(null);
            } else {
              // Check for duplicate by email before inserting
              const candidateEmail = candidate.resume?.contacts?.email || 
                                    (candidate.resume?.contacts as any)?.email;
              
              if (candidateEmail) {
                // First check in local state (faster)
                const localDuplicate = candidates.find(c => {
                  const email = c.resume?.contacts?.email;
                  return email && email.toLowerCase() === candidateEmail.toLowerCase();
                });
                
                // Check for duplicate - create promise to wait for user response
                let shouldContinue = true;
                
                if (localDuplicate) {
                  // Show modal for local duplicate
                  shouldContinue = await new Promise<boolean>((resolve) => {
                    setDuplicateWarning({
                      show: true,
                      email: candidateEmail,
                      existingName: localDuplicate.name,
                      onConfirm: () => {
                        setDuplicateWarning(null);
                        resolve(true);
                      },
                      onCancel: () => {
                        setDuplicateWarning(null);
                        resolve(false);
                      },
                    });
                  });
                } else {
                  // Search for existing candidate with the same email in database
                  const { data: existingCandidates, error: searchError } = await supabase
                    .from('candidates')
                    .select('id, name, resume_data')
                    .eq('resume_data->contacts->>email', candidateEmail);
                  
                  if (searchError) {
                    console.error('Error checking for duplicates:', searchError);
                    // If search fails, allow insert
                    shouldContinue = true;
                  } else if (existingCandidates && existingCandidates.length > 0) {
                    const existingCandidate = existingCandidates[0];
                    const existingName = existingCandidate.name || 'Unknown';
                    // Show modal for database duplicate
                    shouldContinue = await new Promise<boolean>((resolve) => {
                      setDuplicateWarning({
                        show: true,
                        email: candidateEmail,
                        existingName: existingName,
                        onConfirm: () => {
                          setDuplicateWarning(null);
                          resolve(true);
                        },
                        onCancel: () => {
                          setDuplicateWarning(null);
                          resolve(false);
                        },
                      });
                    });
                  }
                }

                if (!shouldContinue) {
                  // User cancelled
                  return;
                }
              }
              
              // Add job_title_embedding if available (as array for pgvector)
              if (jobTitleEmbedding && jobTitleEmbedding.length > 0) {
                candidateData.job_title_embedding = jobTitleEmbedding;
              }
              
              // Add new candidate to Supabase
              const { data, error } = await supabase
                .from('candidates')
                .insert([candidateData])
                .select();

              if (error) {
                console.error('Error saving candidate:', error);
                // Check if error is about missing salary_unit column
                if (error.message && error.message.includes('salary_unit')) {
                  alert('Database schema needs to be updated. Please run the SQL script from add_salary_unit.sql in Supabase Dashboard to add the salary_unit column.');
                } else {
                  alert('Failed to save candidate. Please check if you have permission to add candidates.');
                }
                return;
              }

              // Save unified titles in both tables
              if (candidate.unifiedTitles !== undefined && data && data[0]) {
                if (candidate.unifiedTitles.length > 0) {
                  const titlesToInsert = candidate.unifiedTitles.map(title => ({
                    candidate_id: data[0].id,
                    unified_title: title,
                  }));
                  
                  await supabase
                    .from('candidate_unified_titles')
                    .insert(titlesToInsert);
                }
                
                // Also update unified_titles array in candidates table
                try {
                  await supabase
                    .from('candidates')
                    .update({ unified_titles: candidate.unifiedTitles })
                    .eq('id', data[0].id);
                } catch (err) {
                  // If column doesn't exist, silently fail (user needs to run SQL script)
                  console.warn('Could not update unified_titles column:', err);
                }
              }

              // Reload unified titles from database
              const { data: titlesData } = await supabase
                .from('candidate_unified_titles')
                .select('unified_title')
                .eq('candidate_id', data[0].id);
              
              // Also check main table
              const { data: newCandidateData } = await supabase
                .from('candidates')
                .select('unified_titles')
                .eq('id', data[0].id)
                .single();
              
              const finalUnifiedTitles = (newCandidateData?.unified_titles && newCandidateData.unified_titles.length > 0)
                ? newCandidateData.unified_titles
                : (titlesData?.map(t => t.unified_title) || candidate.unifiedTitles || []);

              // Update local state with new candidate from DB
              if (data && data[0]) {
                const newCandidate: Candidate = {
                  ...candidate,
                  id: data[0].id,
                  unifiedTitles: finalUnifiedTitles,
                };
                setCandidates((prev) => [newCandidate, ...prev]);
                
                // Generate embeddings for the new candidate
                try {
                  await generateCandidateEmbeddings(data[0].id);
                  console.log('Embeddings generated successfully for new candidate', data[0].id);
                } catch (embeddingError) {
                  console.error('Error generating embeddings:', embeddingError);
                  // Don't block the save operation if embeddings fail
                }
              }
              setIsAddModalOpen(false);
            }
          } catch (error) {
            console.error('Error saving candidate:', error);
            alert('An unexpected error occurred. Please try again.');
          }
        }}
        editingCandidate={editingCandidate}
      />
    </div>
  );
};

export default SearchPage;

