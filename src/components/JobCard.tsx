import React, { useState } from 'react';
import { MapPin, Calendar, Users, Edit, Building2, Trash2, FileText, Clock, Globe, Eye } from 'lucide-react';
import { Job } from '../types';
import JobDescriptionModal from './JobDescriptionModal';

interface JobCardProps {
  job: Job;
  onViewMatches: (jobId: number) => void;
  onEdit: (job: Job) => void;
  onDelete?: (jobId: number) => void;
  onView?: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onViewMatches, onEdit, onDelete, onView }) => {
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  
  const getStatusColor = (status: Job['status']) => {
    switch (status) {
      case 'active':
        return '#10b981'; // green
      case 'paused':
        return '#f59e0b'; // yellow
      case 'closed':
        return '#ef4444'; // red
      default:
        return '#7C3AED';
    }
  };

  const locations = job.locations && job.locations.length > 0 
    ? job.locations 
    : (job.location ? [job.location] : []);

  return (
    <>
      <div className="relative bg-white rounded-xl shadow-md border border-gray-200 p-6 transition-all duration-300 hover:shadow-lg group">
        {/* Header Section - LinkedIn style */}
        <div className="mb-4">
          {/* Company Name */}
          {job.companyName && (
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-5 h-5 text-[#7C3AED]" />
              <span className="text-base font-semibold text-gray-900">{job.companyName}</span>
            </div>
          )}

          {/* Job Title */}
          <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-[#7C3AED] transition-colors duration-300">
            {job.title}
          </h3>

          {/* Unified Titles */}
          {job.unifiedTitles && job.unifiedTitles.length > 0 && (
            <div className="mb-2">
              <span className="text-sm text-gray-600">
                {job.unifiedTitles.join(' • ')}
              </span>
            </div>
          )}

          {/* Location, Workplace Type, Employment Type - LinkedIn style */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 mb-3">
            {locations.length > 0 && (
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-gray-500" />
                <span>{locations.join(', ')}</span>
              </div>
            )}
            {job.workplaceType && (
              <div className="flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-gray-500" />
                <span>{job.workplaceType}</span>
              </div>
            )}
            {job.employmentType && (
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-gray-500" />
                <span>{job.employmentType}</span>
              </div>
            )}
            {job.seniorityLevel && job.seniorityLevel !== 'Not Applicable' && (
              <span className="text-gray-500">• {job.seniorityLevel}</span>
            )}
          </div>

          {/* Posted Date */}
          {job.postedDate && (
            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-4">
              <Calendar className="w-3.5 h-3.5" />
              <span>Posted {job.postedDate}</span>
            </div>
          )}
        </div>

        {/* Job Description Preview - LinkedIn style */}
        {job.description && (
          <div className="mb-4">
            <div className="text-sm text-gray-700 line-clamp-3 whitespace-pre-wrap mb-2">
              {job.description}
            </div>
            <button
              onClick={() => setIsDescriptionModalOpen(true)}
              className="text-sm text-[#7C3AED] hover:text-[#06B6D4] font-medium flex items-center gap-1 transition-colors"
            >
              <FileText className="w-4 h-4" />
              See more
            </button>
          </div>
        )}

        {/* Industries - LinkedIn style tags */}
        {job.industry && job.industry.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {job.industry.slice(0, 3).map((ind, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-green-50 border border-green-200 text-green-800 rounded-full text-xs font-medium"
                >
                  {ind}
                </span>
              ))}
              {job.industry.length > 3 && (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  +{job.industry.length - 3} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Skills - LinkedIn style tags */}
        {job.skills && job.skills.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {job.skills.slice(0, 5).map((skill, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-gray-100 border border-gray-300 text-gray-700 rounded-full text-xs font-medium"
                >
                  {skill}
                </span>
              ))}
              {job.skills.length > 5 && (
                <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                  +{job.skills.length - 5} more
                </span>
              )}
            </div>
          </div>
        )}

        {/* Match count badge */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-full text-sm font-semibold shadow-sm">
            <Users className="w-4 h-4" />
            {job.matchCount} matches
          </span>
        </div>

        {/* Card footer - Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200">
          {onView && (
            <button
              onClick={() => onView(job)}
              className="px-4 py-2.5 border-2 border-[#7C3AED] text-[#7C3AED] font-semibold rounded-lg hover:bg-purple-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              View
            </button>
          )}
          <button
            onClick={() => onViewMatches(job.id)}
            className="flex-1 px-4 py-2.5 bg-[#0A66C2] text-white font-semibold rounded-lg hover:bg-[#084d94] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:ring-offset-2"
          >
            Find Matches
          </button>
          <button
            onClick={() => onEdit(job)}
            className="px-4 py-2.5 border-2 border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          {onDelete && (
            <button
              onClick={() => onDelete(job.id)}
              className="p-2.5 border-2 border-red-300 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-400 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
              aria-label="Delete job"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      
      {/* Job Description Modal */}
      <JobDescriptionModal
        job={job}
        isOpen={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
      />
    </>
  );
};

export default JobCard;
