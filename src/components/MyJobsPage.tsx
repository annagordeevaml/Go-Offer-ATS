import React, { useState } from 'react';
import { Briefcase, Plus } from 'lucide-react';
import Header from './Header';
import ChatBot from './ChatBot';
import JobCard from './JobCard';
import AddJobModal from './AddJobModal';
import { Job, JobFormData } from '../types';

interface MyJobsPageProps {
  onNavigate?: (page: 'Search' | 'My Jobs' | 'Analytics') => void;
}

const MyJobsPage: React.FC<MyJobsPageProps> = ({ onNavigate }) => {
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: 1,
      title: 'Senior Backend Engineer',
      location: 'San Francisco, CA',
      postedDate: '3 days ago',
      matchCount: 12,
      skills: ['Python', 'Django', 'PostgreSQL', 'AWS'],
      status: 'active',
    },
    {
      id: 2,
      title: 'Product Manager',
      location: 'Remote (US)',
      postedDate: '1 week ago',
      matchCount: 8,
      skills: ['Product Strategy', 'Analytics', 'Agile'],
      status: 'active',
    },
    {
      id: 3,
      title: 'Frontend Developer',
      location: 'New York, NY',
      postedDate: '2 weeks ago',
      matchCount: 15,
      skills: ['React', 'TypeScript', 'Next.js', 'Tailwind CSS'],
      status: 'paused',
    },
    {
      id: 4,
      title: 'DevOps Engineer',
      location: 'Austin, TX',
      postedDate: '1 month ago',
      matchCount: 5,
      skills: ['Kubernetes', 'Docker', 'CI/CD', 'Terraform'],
      status: 'closed',
    },
    {
      id: 5,
      title: 'Data Scientist',
      location: 'Seattle, WA',
      postedDate: '5 days ago',
      matchCount: 20,
      skills: ['Python', 'Machine Learning', 'TensorFlow', 'SQL'],
      status: 'active',
    },
    {
      id: 6,
      title: 'Full Stack Developer',
      location: 'Remote (EU)',
      postedDate: '2 days ago',
      matchCount: 18,
      skills: ['Node.js', 'React', 'MongoDB', 'GraphQL'],
      status: 'active',
    },
  ]);

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);

  const activeJobsCount = jobs.filter(job => job.status === 'active').length;
  const totalMatches = jobs.reduce((sum, job) => sum + job.matchCount, 0);

  const handleViewMatches = (jobId: number) => {
    console.log('View matches for job:', jobId);
    // Navigate to search page with pre-filled job
  };

  const handleEdit = (job: Job) => {
    const jobFormData: JobFormData = {
      title: job.title,
      location: job.location,
      skills: job.skills,
      description: '', // In real app, fetch full description
    };
    setEditingJob(jobFormData);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingJob(null);
    setIsModalOpen(true);
  };

  const handleSaveJob = (jobData: JobFormData) => {
    if (editingJob) {
      // Find job by title and location (in real app, use ID)
      const jobToUpdate = jobs.find(job => 
        job.title === editingJob.title && job.location === editingJob.location
      );
      
      if (jobToUpdate) {
        // Update existing job
        setJobs(jobs.map(job => 
          job.id === jobToUpdate.id 
            ? { ...job, title: jobData.title, location: jobData.location, skills: jobData.skills }
            : job
        ));
      }
    } else {
      // Add new job
      const newJob: Job = {
        id: Math.max(...jobs.map(j => j.id), 0) + 1,
        title: jobData.title,
        location: jobData.location,
        postedDate: 'Just now',
        matchCount: 0,
        skills: jobData.skills,
        status: 'active',
      };
      setJobs([...jobs, newJob]);
    }
    setIsModalOpen(false);
    setEditingJob(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8E9EB] via-[#E0E2E5] to-[#E8E9EB] relative overflow-hidden">
      
      <Header activePage="My Jobs" />
      
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        {/* Page Header Section */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-[#7C3AED] via-[#06B6D4] to-[#7C3AED] bg-clip-text text-transparent animate-gradient-x">
                My Job Postings
              </h1>
              <p className="text-purple-300 text-sm sm:text-base">
                {activeJobsCount} active jobs • {totalMatches} candidates matched
              </p>
            </div>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-[0_0_25px_rgba(124,58,237,0.7)] transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] focus:ring-offset-2 focus:ring-offset-transparent"
            >
              <Plus className="w-5 h-5" />
              Add New Job
            </button>
          </div>
        </section>

        {/* Jobs Grid */}
        {jobs.length > 0 ? (
          <section>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onViewMatches={handleViewMatches}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          </section>
        ) : (
          /* Empty State */
          <section className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <Briefcase className="w-24 h-24 text-purple-500 mb-6" strokeWidth={1.5} />
            <h2 className="text-2xl font-bold text-white mb-2">No job postings yet</h2>
            <p className="text-purple-300 mb-8 max-w-md">
              Start by adding your first job posting to find the perfect candidates
            </p>
            <button
              onClick={handleAddNew}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-[0_0_25px_rgba(124,58,237,0.7)] transition-all duration-300 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
            >
              <Plus className="w-5 h-5" />
              Add Your First Job
            </button>
          </section>
        )}
      </main>

      {/* Add/Edit Job Modal */}
      <AddJobModal
        open={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingJob(null);
        }}
        onSave={handleSaveJob}
        editingJob={editingJob as JobFormData | null}
      />
      <ChatBot />
    </div>
  );
};

export default MyJobsPage;

