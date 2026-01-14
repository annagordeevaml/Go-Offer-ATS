import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Plus, MapPin, Building2, Globe, Tag, Code, Calendar } from 'lucide-react';
import Header from './Header';
import HeroSection from './HeroSection';
import ChatBot from './ChatBot';
import JobCard from './JobCard';
import AddJobModal from './AddJobModal';
import JobMatchesPage from './JobMatchesPage';
import JobDescriptionModal from './JobDescriptionModal';
import { Job, JobFormData, JobDescription } from '../types';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../hooks/useAuth';
import galaxyBg from '../../images/logo/galaxy.jpg';
import { normalizeJobTitle, generateJobTitleEmbedding } from '../services/jobTitleNormalization';
import { normalizeAllJobTitlesForJobs } from '../utils/normalizeAllJobTitlesForJobs';
import { normalizeLocation, generateLocationEmbedding } from '../services/locationNormalization';
import { normalizeAllJobLocations } from '../utils/normalizeAllLocations';
import { normalizeIndustries, generateIndustriesEmbedding } from '../services/industriesNormalization';
import { updateAllJobIndustries } from '../utils/updateAllJobIndustries';
import { updateAllJobSkills } from '../utils/updateAllJobSkills';
import { normalizeJobSkills } from '../services/skillsNormalization';
import { Loader2 } from 'lucide-react';

interface MyJobsPageProps {
  onNavigate?: (page: 'Star Catalogue' | 'My Jobs' | 'Analytics') => void;
}

const MyJobsPage: React.FC<MyJobsPageProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const { user } = useAuth();

  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState<boolean>(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [viewingJob, setViewingJob] = useState<Job | null>(null);
  const [selectedJobForMatches, setSelectedJobForMatches] = useState<Job | null>(null);
  const [isNormalizingJobTitles, setIsNormalizingJobTitles] = useState(false);
  const [isNormalizingLocations, setIsNormalizingLocations] = useState(false);
  const [isUpdatingIndustries, setIsUpdatingIndustries] = useState(false);
  const [isUpdatingJobSkills, setIsUpdatingJobSkills] = useState(false);

  // Load jobs from Supabase on component mount - only for current user
  useEffect(() => {
    if (!user) return;

    const loadJobs = async () => {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id); // Only load jobs for current authenticated user
      
      if (!error && data) {
        // Map Supabase data (snake_case) to Job format (camelCase)
        const mappedJobs: Job[] = data.map((job: any) => ({
          id: job.id,
          title: job.title,
          location: job.location,
          locations: job.locations || (job.location ? [job.location] : []),
          postedDate: job.posted_date || job.postedDate,
          matchCount: job.match_count || job.matchCount || 0,
          skills: job.skills || [],
          hardSkills: job.hard_skills || [], // Add hard_skills from database
          status: job.status,
          companyName: job.company_name || job.companyName,
          industry: job.industry,
          unifiedTitles: job.unified_titles || [],
          description: job.description || null,
          workplaceType: job.workplace_type,
          employmentType: job.employment_type,
          seniorityLevel: job.seniority_level,
          consideringRelocation: job.considering_relocation || false,
          acceptsRemoteCandidates: job.accepts_remote_candidates || false,
        }));
        setJobs(mappedJobs);
      } else if (error) {
        console.error('Error loading jobs:', error);
      }
    };
    loadJobs();
  }, [user]);

  const activeJobsCount = jobs.filter(job => job.status === 'active').length + jobDescriptions.filter(job => job.status === 'active').length;
  const totalMatches = jobs.reduce((sum, job) => sum + job.matchCount, 0);
  const totalJobs = jobs.length + jobDescriptions.length;

  const handleViewMatches = (jobId: number) => {
    const job = jobs.find(j => j.id === jobId);
    if (job) {
      setSelectedJobForMatches(job);
    }
  };

  const handleViewJob = (job: Job) => {
    setViewingJob(job);
    setIsViewModalOpen(true);
  };

  const handleEdit = async (job: Job) => {
    // Load hard_skills from database if not already loaded
    let hardSkills: string[] = job.hardSkills || [];
    if (!hardSkills || hardSkills.length === 0) {
      try {
        const { data: jobData } = await supabase
          .from('jobs')
          .select('hard_skills')
          .eq('id', job.id)
          .single();
        hardSkills = jobData?.hard_skills || [];
      } catch (error) {
        console.error('Error loading hard_skills:', error);
      }
    }
    
    // Convert industry array to comma-separated string for the form
    const industryString = job.industry && Array.isArray(job.industry) 
      ? job.industry.join(', ')
      : (job.industry || '');

    const jobFormData: JobFormData = {
      title: job.title,
      location: job.location,
      locations: job.locations || (job.location ? [job.location] : []),
      skills: hardSkills.length > 0 ? hardSkills : (job.skills || []), // Use hard_skills if available
      companyName: job.companyName,
      industry: industryString,
      description: job.description || '',
      workplaceType: job.workplaceType,
      employmentType: job.employmentType,
      seniorityLevel: job.seniorityLevel,
      consideringRelocation: job.consideringRelocation || false,
      acceptsRemoteCandidates: job.acceptsRemoteCandidates || false,
    };
    const jobWithHardSkills = {
      ...job,
      title: jobFormData.title,
      location: jobFormData.location,
      skills: jobFormData.skills,
      hardSkills: hardSkills, // Pass hard_skills to editingJob
    };
    setEditingJob(jobWithHardSkills);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingJob(null);
    setIsModalOpen(true);
  };

  const handleSaveJob = async (jobData: JobFormData) => {
    if (!user) {
      alert('You must be logged in to save jobs');
      return;
    }

    if (!user.id) {
      console.error('User ID is missing');
      alert('User authentication error. Please log out and log in again.');
      return;
    }

    try {
      // Convert industry to array if it's a string
      const industryArray = jobData.industry 
        ? (Array.isArray(jobData.industry) ? jobData.industry : [jobData.industry])
        : [];

      // Convert skills to array if needed
      const skillsArray = jobData.skills 
        ? (Array.isArray(jobData.skills) ? jobData.skills : [jobData.skills])
        : [];

      if (editingJob) {
        // Normalize location and generate embedding for update
        let normalizedLocation = '';
        let locationEmbedding: number[] | null = null;
        
        const jobLocation = jobData.location || (jobData.locations && jobData.locations.length > 0 ? jobData.locations[0] : '');
        if (jobLocation && jobLocation.trim()) {
          try {
            console.log('Normalizing location for update:', jobLocation);
            normalizedLocation = await normalizeLocation(jobLocation);
            console.log('Normalized location:', normalizedLocation);
            
            if (normalizedLocation) {
              locationEmbedding = await generateLocationEmbedding(normalizedLocation);
              console.log('Location embedding generated:', locationEmbedding ? 'Success' : 'Failed');
            }
          } catch (normalizationError) {
            console.error('Error normalizing location:', normalizationError);
            // Keep original location if normalization fails (don't convert to lowercase)
            normalizedLocation = jobLocation.trim();
          }
        }
        
        // Normalize industries and generate embedding for update
        let normalizedIndustries: string[] = [];
        let industriesEmbedding: number[] | null = null;
        
        if (industryArray && industryArray.length > 0) {
          try {
            console.log('Normalizing industries for update:', industryArray);
            normalizedIndustries = await normalizeIndustries(industryArray);
            console.log('Normalized industries for update:', normalizedIndustries);
            
            if (normalizedIndustries.length > 0) {
              industriesEmbedding = await generateIndustriesEmbedding(normalizedIndustries);
              console.log('Industries embedding generated for update:', industriesEmbedding ? 'Success' : 'Failed');
            }
          } catch (normalizationError) {
            console.error('Error normalizing industries:', normalizationError);
            // Fallback: basic normalization
            normalizedIndustries = industryArray
              .map(i => i.trim().toLowerCase())
              .filter(i => i.length > 0)
              .filter((i, idx, self) => self.indexOf(i) === idx);
          }
        }
        
        // Update existing job in Supabase - ensure it belongs to current user
        const updateData: any = {
          title: jobData.title,
          location: jobLocation,
          normalized_location: normalizedLocation || null,
          locations: jobData.locations || [],
          skills: skillsArray,
          company_name: jobData.companyName || null,
          industry: industryArray,
          normalized_industries: normalizedIndustries.length > 0 ? normalizedIndustries : null,
          description: jobData.description || null,
          workplace_type: jobData.workplaceType || 'Remote',
          employment_type: jobData.employmentType || 'Full-time',
          seniority_level: jobData.seniorityLevel || 'Not Applicable',
          considering_relocation: jobData.consideringRelocation || false,
        };
        
        // Add accepts_remote_candidates if provided (column may not exist yet)
        if (jobData.acceptsRemoteCandidates !== undefined) {
          updateData.accepts_remote_candidates = jobData.acceptsRemoteCandidates;
        }
        
        // Add location_embedding if available
        if (locationEmbedding && locationEmbedding.length > 0) {
          updateData.location_embedding = locationEmbedding;
        }
        // Add industries_embedding if available
        if (industriesEmbedding && industriesEmbedding.length > 0) {
          updateData.industries_embedding = industriesEmbedding;
        }
        
        // Use hard_skills from formData if provided, otherwise extract from description
        if (jobData.hardSkills && jobData.hardSkills.length > 0) {
          updateData.hard_skills = jobData.hardSkills;
        } else if (jobData.description && jobData.description.trim().length > 0) {
          try {
            console.log('Extracting skills from job description for update...');
            const normalizedJobSkills = await normalizeJobSkills(editingJob.id, jobData.description);
            console.log('Extracted skills for update:', normalizedJobSkills);
            if (normalizedJobSkills.length > 0) {
              updateData.hard_skills = normalizedJobSkills;
            }
          } catch (skillsError) {
            console.error('Error extracting skills from job description:', skillsError);
            // Continue without skills if extraction fails
          }
        }
        
        // Add unified_titles if available (temporarily commented out until DB column is added)
        // if (jobData.unifiedTitles) {
        //   updateData.unified_titles = jobData.unifiedTitles;
        // }

        console.log('Updating job:', { jobId: editingJob.id, userId: user.id, data: updateData });

        const { data, error } = await supabase
          .from('jobs')
          .update(updateData)
          .eq('id', editingJob.id)
          .eq('user_id', user.id) // Security: only update own jobs
          .select();

        if (error) {
          console.error('Error updating job:', error);
          
          // Check for missing column errors
          if (error.message && error.message.includes('unified_titles')) {
            alert('Database schema needs to be updated. Please run the SQL script from add_unified_titles_to_jobs.sql in Supabase Dashboard to add the unified_titles column.');
          } else if (error.message && error.message.includes('accepts_remote_candidates')) {
            alert('Database schema needs to be updated. Please run the SQL script from add_accepts_remote_candidates_to_jobs.sql in Supabase Dashboard to add the accepts_remote_candidates column. See INSTRUCTIONS_ACCEPTS_REMOTE_CANDIDATES.md for details.');
          } else {
            alert(`Failed to update job: ${error.message || 'Unknown error'}. Check console for details.`);
          }
          return;
        }

        if (data && data[0]) {
          // Map Supabase response to Job format
          const updatedJob: Job = {
            id: data[0].id,
            title: data[0].title,
            location: data[0].location,
            locations: data[0].locations || (data[0].location ? [data[0].location] : []),
            postedDate: data[0].posted_date,
            matchCount: data[0].match_count || 0,
            skills: data[0].skills || [],
            status: data[0].status,
            companyName: data[0].company_name,
            industry: data[0].industry || [],
            unifiedTitles: data[0].unified_titles || [],
            description: data[0].description || null,
            workplaceType: data[0].workplace_type,
            employmentType: data[0].employment_type,
            seniorityLevel: data[0].seniority_level,
            consideringRelocation: data[0].considering_relocation || false,
            acceptsRemoteCandidates: data[0].accepts_remote_candidates || false,
          };
          setJobs(jobs.map(job => job.id === editingJob.id ? updatedJob : job));
        }
      } else {
        // Normalize job title and generate embedding
        let normalizedTitle = '';
        let titleEmbedding: number[] | null = null;
        
        if (jobData.title && jobData.title.trim()) {
          try {
            console.log('Normalizing job title:', jobData.title);
            normalizedTitle = await normalizeJobTitle(jobData.title);
            console.log('Normalized job title:', normalizedTitle);
            
            if (normalizedTitle) {
              titleEmbedding = await generateJobTitleEmbedding(normalizedTitle);
              console.log('Job title embedding generated:', titleEmbedding ? 'Success' : 'Failed');
            }
          } catch (normalizationError) {
            console.error('Error normalizing job title:', normalizationError);
            // Continue with original title if normalization fails
            normalizedTitle = jobData.title.toLowerCase().trim();
          }
        }
        
        // Normalize location and generate embedding
        let normalizedLocation = '';
        let locationEmbedding: number[] | null = null;
        
        const jobLocation = jobData.location || (jobData.locations && jobData.locations.length > 0 ? jobData.locations[0] : '');
        if (jobLocation && jobLocation.trim()) {
          try {
            console.log('Normalizing location:', jobLocation);
            normalizedLocation = await normalizeLocation(jobLocation);
            console.log('Normalized location:', normalizedLocation);
            
            if (normalizedLocation) {
              locationEmbedding = await generateLocationEmbedding(normalizedLocation);
              console.log('Location embedding generated:', locationEmbedding ? 'Success' : 'Failed');
            }
          } catch (normalizationError) {
            console.error('Error normalizing location:', normalizationError);
            // Keep original location if normalization fails (don't convert to lowercase)
            normalizedLocation = jobLocation.trim();
          }
        }
        
        // Normalize industries and generate embedding
        let normalizedIndustries: string[] = [];
        let industriesEmbedding: number[] | null = null;
        
        if (industryArray && industryArray.length > 0) {
          try {
            console.log('Normalizing industries:', industryArray);
            normalizedIndustries = await normalizeIndustries(industryArray);
            console.log('Normalized industries:', normalizedIndustries);
            
            if (normalizedIndustries.length > 0) {
              industriesEmbedding = await generateIndustriesEmbedding(normalizedIndustries);
              console.log('Industries embedding generated:', industriesEmbedding ? 'Success' : 'Failed');
            }
          } catch (normalizationError) {
            console.error('Error normalizing industries:', normalizationError);
            // Fallback: basic normalization
            normalizedIndustries = industryArray
              .map(i => i.trim().toLowerCase())
              .filter(i => i.length > 0)
              .filter((i, idx, self) => self.indexOf(i) === idx);
          }
        }
        
        // Use hard_skills from formData if provided, otherwise extract from description
        let finalHardSkills: string[] = [];
        if (jobData.hardSkills && jobData.hardSkills.length > 0) {
          finalHardSkills = jobData.hardSkills;
        } else if (jobData.description && jobData.description.trim().length > 0) {
          try {
            console.log('Extracting skills from job description for new job...');
            finalHardSkills = await normalizeJobSkills('new', jobData.description);
            console.log('Extracted skills for new job:', finalHardSkills);
          } catch (skillsError) {
            console.error('Error extracting skills from job description:', skillsError);
            // Continue without skills if extraction fails
          }
        }
        
        // Add new job to Supabase with user_id
        const newJobData: any = {
          title: jobData.title,
          normalized_title: normalizedTitle || null,
          location: jobLocation,
          normalized_location: normalizedLocation || null,
          locations: jobData.locations || [],
          posted_date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          match_count: 0,
          skills: skillsArray,
          status: 'active',
          company_name: jobData.companyName || null,
          industry: industryArray,
          normalized_industries: normalizedIndustries.length > 0 ? normalizedIndustries : null,
          hard_skills: finalHardSkills.length > 0 ? finalHardSkills : null,
          description: jobData.description || null,
          considering_relocation: jobData.consideringRelocation || false,
          // accepts_remote_candidates: jobData.acceptsRemoteCandidates || false, // Temporarily commented out until DB column is added
          user_id: user.id, // Associate job with current authenticated user
        };
        
        // Add accepts_remote_candidates if column exists (will be added after migration)
        try {
          if (jobData.acceptsRemoteCandidates !== undefined) {
            newJobData.accepts_remote_candidates = jobData.acceptsRemoteCandidates;
          }
        } catch (e) {
          // Column doesn't exist yet, skip it
          console.warn('accepts_remote_candidates column not found, skipping...');
        }
        
        // Add embeddings if available
        if (titleEmbedding && titleEmbedding.length > 0) {
          newJobData.title_embedding = titleEmbedding;
        }
        if (locationEmbedding && locationEmbedding.length > 0) {
          newJobData.location_embedding = locationEmbedding;
        }
        if (industriesEmbedding && industriesEmbedding.length > 0) {
          newJobData.industries_embedding = industriesEmbedding;
        }
        
        // Add unified_titles if available (temporarily commented out until DB column is added)
        // if (jobData.unifiedTitles) {
        //   newJobData.unified_titles = jobData.unifiedTitles;
        // }

        console.log('Saving new job:', { userId: user.id, data: newJobData });

        const { data, error } = await supabase
          .from('jobs')
          .insert([newJobData])
          .select();

        if (error) {
          console.error('Error saving job:', error);
          console.error('Error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          });
          
          // Check if error is about missing unified_titles column
          if (error.message && error.message.includes('unified_titles')) {
            alert('Database schema needs to be updated. Please run the SQL script from add_unified_titles_to_jobs.sql in Supabase Dashboard to add the unified_titles column.');
          } else {
            alert(`Failed to save job: ${error.message || 'Unknown error'}. Check console for details.`);
          }
          return;
        }

        if (data && data[0]) {
          // Map Supabase response to Job format
          const newJob: Job = {
            id: data[0].id,
            title: data[0].title,
            location: data[0].location,
            locations: data[0].locations || (data[0].location ? [data[0].location] : []),
            postedDate: data[0].posted_date,
            matchCount: data[0].match_count || 0,
            skills: data[0].skills || [],
            status: data[0].status,
            companyName: data[0].company_name,
            industry: data[0].industry || [],
            unifiedTitles: data[0].unified_titles || [],
            description: data[0].description || null,
            workplaceType: data[0].workplace_type || 'Remote',
            employmentType: data[0].employment_type || 'Full-time',
            seniorityLevel: data[0].seniority_level || 'Not Applicable',
            consideringRelocation: data[0].considering_relocation || false,
            acceptsRemoteCandidates: data[0].accepts_remote_candidates || false,
          };
          setJobs([newJob, ...jobs]);
        } else {
          console.error('No data returned from insert');
          alert('Failed to save job: No data returned. Check console for details.');
          return;
        }
      }
      
      setIsModalOpen(false);
      setEditingJob(null);
    } catch (err: any) {
      console.error('Unexpected error saving job:', err);
      alert(`Unexpected error: ${err.message || 'Unknown error'}. Check console for details.`);
    }
  };

  const handleDeleteJob = async (id: number) => {
    if (!user) {
      alert('You must be logged in to delete jobs');
      return;
    }

    if (confirm('Are you sure you want to delete this job?')) {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id); // Security: only delete own jobs

      if (!error) {
        setJobs(prev => prev.filter(job => job.id !== id));
      } else {
        console.error('Error deleting job:', error);
        alert('Failed to delete job. Please try again.');
      }
    }
  };

  const handleDeleteJobDescription = (id: number) => {
    if (confirm('Are you sure you want to delete this job description?')) {
      setJobDescriptions(prev => prev.filter(job => job.id !== id));
    }
  };

  const handleNormalizeAllJobTitles = async () => {
    if (!confirm('This will normalize job titles and generate embeddings for ALL jobs in the database. This may take a while and use OpenAI API credits. Continue?')) {
      return;
    }
    
    setIsNormalizingJobTitles(true);
    try {
      await normalizeAllJobTitlesForJobs();
      alert('Job title normalization complete! Check console for details. The page will reload to show updated data.');
      // Reload jobs to show updated data
      window.location.reload();
    } catch (error) {
      console.error('Error normalizing job titles:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error normalizing job titles:\n\n${errorMessage}\n\nCheck console for more details.`);
    } finally {
      setIsNormalizingJobTitles(false);
    }
  };

  const handleNormalizeAllJobLocations = async () => {
    if (!confirm('This will normalize locations and generate embeddings for ALL jobs in the database. This may take a while and use OpenAI API credits. Continue?')) {
      return;
    }
    
    setIsNormalizingLocations(true);
    try {
      await normalizeAllJobLocations();
      alert('Location normalization complete! Check console for details. The page will reload to show updated data.');
      window.location.reload();
    } catch (error) {
      console.error('Error normalizing locations:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error normalizing locations:\n\n${errorMessage}\n\nCheck console for more details.`);
    } finally {
      setIsNormalizingLocations(false);
    }
  };

  const handleUpdateAllIndustries = async () => {
    if (!confirm('This will normalize industries and generate embeddings for ALL jobs in the database. This may take a while and use OpenAI API credits. Continue?')) {
      return;
    }
    
    setIsUpdatingIndustries(true);
    try {
      await updateAllJobIndustries();
      alert('Industries update complete! Check console for details. The page will reload to show updated data.');
      window.location.reload();
    } catch (error) {
      console.error('Error updating industries:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error updating industries:\n\n${errorMessage}\n\nCheck console for more details.`);
    } finally {
      setIsUpdatingIndustries(false);
    }
  };

  const handleUpdateAllJobSkills = async () => {
    if (!confirm('This will extract and normalize skills from ALL job descriptions in the database. This may take a while and use OpenAI API credits. Continue?')) {
      return;
    }
    
    setIsUpdatingJobSkills(true);
    try {
      await updateAllJobSkills();
      alert('Job skills update complete! Check console for details. The page will reload to show updated data.');
      window.location.reload();
    } catch (error) {
      console.error('Error updating job skills:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error updating job skills:\n\n${errorMessage}\n\nCheck console for more details.`);
    } finally {
      setIsUpdatingJobSkills(false);
    }
  };

  // Show matches page if job is selected
  if (selectedJobForMatches) {
    return (
      <JobMatchesPage
        job={selectedJobForMatches}
        onBack={() => setSelectedJobForMatches(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8E9EB] via-[#E0E2E5] to-[#E8E9EB]">
      {/* Header with background */}
      <div 
        className="relative w-full bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: `url(${galaxyBg})`,
          filter: 'contrast(1.15) saturate(1.1)',
        }}
      >
        <div className="hero-gradient-overlay"></div>
        <Header activePage="My Jobs" />
        <div className="max-w-7xl mx-auto px-8 py-12 relative z-10">
          <HeroSection />
        </div>
      </div>
      
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Page Header Section */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-[#7C3AED] via-[#06B6D4] to-[#7C3AED] bg-clip-text text-transparent animate-gradient-x">
                My Job Postings
              </h1>
              <p className="text-gray-600 text-sm sm:text-base">
                {totalJobs} {totalJobs === 1 ? 'job' : 'jobs'} • {activeJobsCount} active • {totalMatches} candidates matched
              </p>
            </div>
            <div className="flex items-center gap-3">
              {user && (
                <>
                  <button
                    onClick={handleNormalizeAllJobLocations}
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
                    onClick={handleUpdateAllIndustries}
                    disabled={isUpdatingIndustries}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdatingIndustries ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update All Industries'
                    )}
                  </button>
                  <button
                    onClick={handleUpdateAllJobSkills}
                    disabled={isUpdatingJobSkills}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdatingJobSkills ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : (
                      'Update All Job Skills'
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
                </>
              )}
              <button
                onClick={handleAddNew}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-[0_0_25px_rgba(124,58,237,0.7)] transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-transparent"
              >
                <Plus className="w-5 h-5" />
                Add Job
              </button>
            </div>
          </div>
        </section>

        {/* Jobs Grid */}
        {totalJobs > 0 ? (
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Job Cards from MyJobs */}
              {jobs.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        onViewMatches={handleViewMatches}
                        onEdit={handleEdit}
                        onDelete={handleDeleteJob}
                        onView={handleViewJob}
                      />
              ))}
              
              {/* Job Description Cards */}
              {jobDescriptions.map((job, index) => (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <div className="relative bg-white rounded-2xl shadow-lg border-2 border-gray-200 p-6 hover:border-[#7C3AED] hover:shadow-xl hover:shadow-purple-500/20 transition-all duration-300 hover:scale-[1.02]">
                    {/* Status indicator stripe */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-2xl ${
                      job.status === 'active' ? 'bg-green-500' :
                      job.status === 'paused' ? 'bg-yellow-500' :
                      'bg-gray-400'
                    }`} />
                    
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4 ml-3">
                      <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">{job.jobTitle}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-[#7C3AED]" />
                            <span className="font-medium">{job.companyName}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-4 h-4 text-[#06B6D4]" />
                            <span className="font-medium">{job.location}</span>
                          </div>
                        </div>
                        {job.postedDate && (
                          <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-3">
                            <Calendar className="w-4 h-4" />
                            <span>Posted {job.postedDate}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            // Convert JobDescription to Job for editing
                            const jobToEdit: Job = {
                              id: job.id,
                              title: job.jobTitle,
                              location: job.location,
                              postedDate: job.postedDate || job.createdAt,
                              matchCount: 0,
                              skills: job.hardSkills || [],
                              status: job.status,
                              companyName: job.companyName,
                              industry: job.industry,
                            };
                            setEditingJob(jobToEdit);
                            setIsModalOpen(true);
                          }}
                          className="px-3 py-1.5 text-xs font-semibold text-[#7C3AED] border-2 border-[#7C3AED] rounded-lg hover:bg-purple-50 transition-all duration-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteJobDescription(job.id)}
                          className="px-3 py-1.5 text-xs font-semibold text-red-600 border-2 border-red-300 rounded-lg hover:bg-red-50 transition-all duration-200"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {/* Meta Info */}
                    <div className="space-y-2 mb-4 ml-3">
                      {job.industry && Array.isArray(job.industry) && job.industry.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Tag className="w-4 h-4 text-cyan-600" />
                            <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Industries</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {job.industry.map((ind, idx) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-300 text-cyan-800 rounded-full text-xs font-medium shadow-sm"
                              >
                                {ind}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-sm">
                        <Globe className="w-4 h-4 text-gray-500" />
                        <span className="font-semibold text-gray-700">Considering Relocation:</span>
                        <span className={`font-bold ${job.consideringRelocation ? 'text-green-600' : 'text-gray-500'}`}>
                          {job.consideringRelocation ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>

                    {/* Hard Skills */}
                    {job.hardSkills && job.hardSkills.length > 0 && (
                      <div className="mb-4 ml-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Code className="w-4 h-4 text-purple-600" />
                          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Hard Skills</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {job.hardSkills.map((skill, idx) => (
                            <span
                              key={idx}
                              className="px-3 py-1.5 bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-300 text-purple-800 rounded-full text-xs font-medium shadow-sm"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Job Description - Full text, no shortening */}
                    {job.jobDescription && (
                      <div className="mt-4 pt-4 border-t border-gray-200 ml-3">
                        <p className="text-xs font-bold text-gray-700 uppercase mb-2 tracking-wide">Description</p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3 leading-relaxed">
                          {job.jobDescription}
                        </p>
                      </div>
                    )}

                    {/* Footer */}
                    <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between text-xs ml-3">
                      <div className="flex items-center gap-1.5 text-gray-600 font-medium">
                        <Calendar className="w-3 h-3" />
                        <span>Posted: {job.postedDate || job.createdAt}</span>
                      </div>
                      <span className={`px-3 py-1.5 rounded-full font-semibold shadow-sm ${
                        job.status === 'active' ? 'bg-green-100 text-green-700 border border-green-300' :
                        job.status === 'paused' ? 'bg-yellow-100 text-yellow-700 border border-yellow-300' :
                        'bg-gray-100 text-gray-700 border border-gray-300'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </section>
        ) : (
          /* Empty State */
          <section className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Briefcase className="w-24 h-24 text-[#7C3AED] mb-6" strokeWidth={1.5} />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">No job postings yet</h2>
            <p className="text-gray-600 mb-8 max-w-md">
              Start by adding your first job posting to find the perfect candidates
            </p>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-[0_0_25px_rgba(124,58,237,0.7)] transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            >
              <Plus className="w-5 h-5" />
              Add Job
            </button>
          </section>
        )}
      </main>

      {/* Add/Edit Job Modal */}
      <AddJobModal
        open={isModalOpen && !isViewModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingJob(null);
        }}
        onSave={handleSaveJob}
        editingJob={editingJob ? {
          title: editingJob.title,
          location: editingJob.location,
          locations: editingJob.locations || (editingJob.location ? [editingJob.location] : []),
          skills: editingJob.hardSkills && editingJob.hardSkills.length > 0 ? editingJob.hardSkills : editingJob.skills,
          hardSkills: editingJob.hardSkills || editingJob.skills || [],
          companyName: editingJob.companyName,
          industry: editingJob.industry,
          description: editingJob.description || '',
          workplaceType: editingJob.workplaceType,
          employmentType: editingJob.employmentType,
          seniorityLevel: editingJob.seniorityLevel,
          consideringRelocation: editingJob.consideringRelocation,
          acceptsRemoteCandidates: editingJob.acceptsRemoteCandidates,
        } : null}
      />

      {/* View Job Modal (Read-only) */}
      {viewingJob && (
        <JobDescriptionModal
          job={viewingJob}
          isOpen={isViewModalOpen}
          onClose={() => {
            setIsViewModalOpen(false);
            setViewingJob(null);
          }}
        />
      )}
      
      <ChatBot />
    </div>
  );
};

export default MyJobsPage;

