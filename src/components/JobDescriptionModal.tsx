import React from 'react';
import { X, MapPin, Building2, Calendar, Tag, Briefcase } from 'lucide-react';
import { Job } from '../types';

interface JobDescriptionModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
}

const JobDescriptionModal: React.FC<JobDescriptionModalProps> = ({ job, isOpen, onClose }) => {
  if (!isOpen || !job) return null;

  const locations = job.locations && job.locations.length > 0 
    ? job.locations 
    : (job.location ? [job.location] : []);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] px-6 py-4 flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white mb-1">{job.title}</h2>
              {job.companyName && (
                <div className="flex items-center gap-2 text-white/90">
                  <Building2 className="w-4 h-4" />
                  <span className="text-sm font-medium">{job.companyName}</span>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="ml-4 p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            {/* Locations */}
            {locations.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-[#7C3AED]" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Locations</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {locations.map((loc, idx) => (
                    <span
                      key={idx}
                      className="px-4 py-2 bg-gradient-to-r from-purple-50 to-cyan-50 border border-purple-200 text-purple-800 rounded-lg text-sm font-medium"
                    >
                      {loc}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Posted Date */}
            {job.postedDate && (
              <div className="mb-6 flex items-center gap-2 text-gray-600">
                <Calendar className="w-5 h-5 text-[#06B6D4]" />
                <span className="text-sm">Posted {job.postedDate}</span>
              </div>
            )}

            {/* Industries */}
            {job.industry && job.industry.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-5 h-5 text-cyan-600" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Industries</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.industry.map((ind, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-gradient-to-r from-cyan-50 to-blue-50 border border-cyan-300 text-cyan-800 rounded-full text-xs font-medium"
                    >
                      {ind}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Skills */}
            {job.skills && job.skills.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-5 h-5 text-[#7C3AED]" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Required Skills</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-gray-100 border border-gray-300 text-gray-700 rounded-full text-xs font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Job Description */}
            {job.description && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Job Description</h3>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                  <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {job.description}
                  </div>
                </div>
              </div>
            )}

            {/* Unified Titles */}
            {job.unifiedTitles && job.unifiedTitles.length > 0 && (
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Briefcase className="w-5 h-5 text-[#7C3AED]" />
                  <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Job Categories</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {job.unifiedTitles.map((title, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 bg-purple-100 border border-purple-300 text-purple-800 rounded-full text-xs font-medium"
                    >
                      {title}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-lg transition-all duration-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JobDescriptionModal;


