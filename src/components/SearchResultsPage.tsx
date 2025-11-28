import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, Plus } from 'lucide-react';
import Header from './Header';
import HeroSection from './HeroSection';
import CandidateCard from './CandidateCard';
import ConstellationOverlay from './ConstellationOverlay';
import ChatBot from './ChatBot';
import AddCandidateModal from './AddCandidateModal';
import AddJobDescriptionModal from './AddJobDescriptionModal';
import { Candidate, JobDescription } from '../types';
import galaxyBg from '../../images/logo/galaxy.jpg';

interface SearchResultsPageProps {
  onNavigate?: (page: 'Star Catalogue' | 'My Jobs' | 'Analytics') => void;
}

const SearchResultsPage: React.FC<SearchResultsPageProps> = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState<string>('Senior Backend Engineer');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  const [editingCandidate, setEditingCandidate] = useState<Candidate | null>(null);
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  
  const [candidates, setCandidates] = useState<Candidate[]>([]);

  const handleResumeUpload = (candidateId: number, resume: { file: File; htmlContent: string; contacts?: { email: string | null; phone: string | null; linkedin: string | null } }) => {
    setCandidates((prev) =>
      prev.map((candidate) => {
        if (candidate.id === candidateId) {
          const updatedCandidate = { ...candidate, resume };
          // Update LinkedIn link if found in resume
          if (resume.contacts?.linkedin) {
            updatedCandidate.socialLinks = {
              ...candidate.socialLinks,
              linkedin: resume.contacts.linkedin,
            };
          }
          return updatedCandidate;
        }
        return candidate;
      })
    );
  };

  const handleCandidateUpdate = (candidateId: number, updates: Partial<Candidate>) => {
    setCandidates((prev) =>
      prev.map((candidate) =>
        candidate.id === candidateId ? { ...candidate, ...updates } : candidate
      )
    );
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Search query:', searchQuery);
  };

  const handleFilters = () => {
    alert('Filters panel coming soon!');
  };

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
        <ConstellationOverlay />
        <Header activePage="Star Catalogue" />
        <HeroSection />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16" style={{ borderTop: 'none', outline: 'none', boxShadow: 'none' }}>
        {/* Compact Search Bar */}
        <section className="mb-6">
          <form onSubmit={handleSearch} className="relative">
            <div className="search-bar-container relative flex items-center gap-3 rounded-2xl p-2 focus-within:ring-0 transition-all duration-300">
              <Search className="absolute left-4 text-white w-5 h-5 z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Product manager with EdTech experience..."
                className="flex-1 pl-12 pr-4 py-4 bg-transparent text-white placeholder:text-[#e0e7ff]/85 focus:outline-none text-lg z-10"
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

        {/* Results Header */}
        <section className="mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                <span className="bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent">
                  {candidates.length}
                </span>{' '}
                <span className="text-gray-600">candidates found</span>
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg hover:opacity-90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Candidate
              </button>
              <button
                onClick={() => setIsAddJobModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#06B6D4] to-[#7C3AED] text-white rounded-lg hover:opacity-90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#06B6D4] font-semibold"
              >
                <Plus className="w-4 h-4" />
                Add Job Description
              </button>
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
            {candidates.map((candidate, index) => (
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
                />
              </motion.div>
            ))}
          </div>
        </section>
      </main>
      <ChatBot />
      <AddJobDescriptionModal
        open={isAddJobModalOpen}
        onClose={() => setIsAddJobModalOpen(false)}
        onSave={(jobDescription) => {
          setJobDescriptions(prev => [...prev, jobDescription]);
          setIsAddJobModalOpen(false);
          console.log('Job description saved:', jobDescription);
        }}
      />
      <AddCandidateModal
        open={isAddModalOpen || editingCandidate !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingCandidate(null);
        }}
        onSave={(candidate) => {
          if (editingCandidate) {
            // Update existing candidate
            setCandidates((prev) =>
              prev.map((c) => (c.id === candidate.id ? candidate : c))
            );
            setEditingCandidate(null);
          } else {
            // Add new candidate
            setCandidates((prev) => [...prev, candidate]);
            setIsAddModalOpen(false);
          }
        }}
        editingCandidate={editingCandidate}
      />
    </div>
  );
};

export default SearchResultsPage;

