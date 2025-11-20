import React from 'react';
import { MapPin, Calendar, Users, Edit, MoreVertical } from 'lucide-react';
import { Job } from '../types';

interface JobCardProps {
  job: Job;
  onViewMatches: (jobId: number) => void;
  onEdit: (job: Job) => void;
}

const JobCard: React.FC<JobCardProps> = ({ job, onViewMatches, onEdit }) => {
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

  return (
    <div className="relative bg-white/5 backdrop-blur-md border border-purple-500/30 rounded-2xl p-6 transition-all duration-300 hover:scale-105 hover:border-purple-500 hover:shadow-lg hover:shadow-purple-500/50 group">
      {/* Left accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl"
        style={{ backgroundColor: getStatusColor(job.status) }}
      />

      {/* Card content */}
      <div className="ml-2">
        {/* Job title */}
        <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-[#7C3AED] transition-colors duration-300">
          {job.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-2 text-purple-300 mb-3">
          <MapPin className="w-4 h-4" />
          <span className="text-sm">{job.location}</span>
        </div>

        {/* Posted date */}
        <div className="flex items-center gap-2 text-[#e0e7ff]/70 mb-4">
          <Calendar className="w-4 h-4" />
          <span className="text-sm">Posted {job.postedDate}</span>
        </div>

        {/* Match count badge */}
        <div className="mb-4">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-full text-sm font-semibold animate-pulse">
            <Users className="w-4 h-4" />
            {job.matchCount} matches
          </span>
        </div>

        {/* Skills */}
        <div className="flex flex-wrap gap-2 mb-6">
          {job.skills.map((skill, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-xs text-purple-200"
            >
              {skill}
            </span>
          ))}
        </div>

        {/* Card footer */}
        <div className="flex gap-3">
          <button
            onClick={() => onViewMatches(job.id)}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#ec4899] text-white font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(124,58,237,0.6)] transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
          >
            View Matches
          </button>
          <button
            onClick={() => onEdit(job)}
            className="px-4 py-2 border-2 border-purple-500 text-purple-300 font-semibold rounded-lg hover:bg-purple-500/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit
          </button>
          <button
            className="p-2 border-2 border-purple-500/50 text-purple-300 rounded-lg hover:bg-purple-500/20 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            aria-label="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default JobCard;

