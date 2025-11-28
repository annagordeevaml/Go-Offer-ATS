import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Plus, MapPin, Building2, Globe, Tag, Code } from 'lucide-react';
import Header from './Header';
import HeroSection from './HeroSection';
import AddJobDescriptionModal from './AddJobDescriptionModal';
import { JobDescription } from '../types';
import galaxyBg from '../../images/logo/galaxy.jpg';

interface JobDescriptionsPageProps {
  onNavigate?: (page: 'Star Catalogue' | 'My Jobs' | 'Analytics' | 'Job Descriptions') => void;
}

const JobDescriptionsPage: React.FC<JobDescriptionsPageProps> = ({ onNavigate }) => {
  const [jobDescriptions, setJobDescriptions] = useState<JobDescription[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingJobDescription, setEditingJobDescription] = useState<JobDescription | null>(null);

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this job description?')) {
      setJobDescriptions(prev => prev.filter(job => job.id !== id));
    }
  };

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
        <Header activePage="Job Descriptions" />
        <div className="max-w-7xl mx-auto px-8 py-12 relative z-10">
          <HeroSection />
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-8 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] bg-clip-text text-transparent mb-2">
              Job Descriptions
            </h1>
            <p className="text-gray-600">
              {jobDescriptions.length} {jobDescriptions.length === 1 ? 'job' : 'jobs'} posted
            </p>
          </div>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg hover:opacity-90 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] font-semibold shadow-lg"
          >
            <Plus className="w-5 h-5" />
            Add Job Description
          </button>
        </div>

        {/* Jobs Grid */}
        {jobDescriptions.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-2xl font-semibold text-gray-800 mb-2">No job descriptions yet</h3>
            <p className="text-gray-600 mb-6">Add your first job description to start matching candidates</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg hover:opacity-90 transition-opacity font-semibold"
            >
              <Plus className="w-5 h-5 inline mr-2" />
              Add Your First Job
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {jobDescriptions.map((job, index) => (
              <motion.div
                key={job.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="bg-white rounded-xl border border-gray-200 p-6 hover:border-[#7C3AED] hover:shadow-lg transition-all duration-300">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-2">{job.jobTitle}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-4 h-4" />
                          <span>{job.companyName}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" />
                          <span>{job.location}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingJobDescription(job);
                          setIsAddModalOpen(true);
                        }}
                        className="px-3 py-1.5 text-xs text-[#7C3AED] border border-[#7C3AED] rounded-lg hover:bg-purple-50 transition-colors"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(job.id)}
                        className="px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Meta Info */}
                  <div className="space-y-2 mb-4">
                    {job.industry && Array.isArray(job.industry) && job.industry.length > 0 && (
                      <div className="mb-2">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="w-4 h-4 text-gray-500" />
                          <span className="text-xs font-semibold text-gray-500 uppercase">Industries</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {job.industry.map((ind, idx) => (
                            <span
                              key={idx}
                              className="px-2 py-1 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded text-xs"
                            >
                              {ind}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Globe className="w-4 h-4" />
                      <span className="font-medium">Considering Relocation:</span>
                      <span className={job.consideringRelocation ? 'text-green-600' : 'text-gray-500'}>
                        {job.consideringRelocation ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </div>

                  {/* Hard Skills */}
                  {job.hardSkills && job.hardSkills.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Code className="w-4 h-4 text-gray-500" />
                        <span className="text-xs font-semibold text-gray-500 uppercase">Hard Skills</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {job.hardSkills.map((skill, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-1 bg-purple-50 border border-purple-200 text-purple-700 rounded text-xs"
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Job Description - Full text, no shortening */}
                  {job.jobDescription && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Description</p>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">
                        {job.jobDescription}
                      </p>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
                    <span>Created: {job.createdAt}</span>
                    <span className={`px-2 py-1 rounded ${
                      job.status === 'active' ? 'bg-green-100 text-green-700' :
                      job.status === 'paused' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>

      <AddJobDescriptionModal
        open={isAddModalOpen || editingJobDescription !== null}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingJobDescription(null);
        }}
        onSave={(jobDescription) => {
          if (editingJobDescription) {
            setJobDescriptions(prev =>
              prev.map(j => j.id === jobDescription.id ? jobDescription : j)
            );
          } else {
            setJobDescriptions(prev => [...prev, jobDescription]);
          }
          setIsAddModalOpen(false);
          setEditingJobDescription(null);
          // Navigate to Job Descriptions page after saving
          if (onNavigate) {
            onNavigate('Job Descriptions');
          } else {
            window.dispatchEvent(new CustomEvent('navigate', { detail: 'Job Descriptions' }));
          }
        }}
        editingJobDescription={editingJobDescription}
      />
    </div>
  );
};

export default JobDescriptionsPage;

