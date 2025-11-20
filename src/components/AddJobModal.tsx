import React, { useState, useEffect } from 'react';
import { Upload, X } from 'lucide-react';
import Dialog from './Dialog';
import { JobFormData } from '../types';

interface AddJobModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (jobData: JobFormData) => void;
  editingJob?: JobFormData | null;
}

const AddJobModal: React.FC<AddJobModalProps> = ({ open, onClose, onSave, editingJob }) => {
  const [jobDescription, setJobDescription] = useState<string>('');
  const [isParsing, setIsParsing] = useState<boolean>(false);
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    location: '',
    skills: [],
    level: '',
    industry: '',
  });
  const [skillInput, setSkillInput] = useState<string>('');

  useEffect(() => {
    if (editingJob) {
      setFormData(editingJob);
      setJobDescription(editingJob.description || '');
    } else {
      resetForm();
    }
  }, [editingJob, open]);

  const resetForm = () => {
    setJobDescription('');
    setFormData({
      title: '',
      location: '',
      skills: [],
      level: '',
      industry: '',
    });
    setSkillInput('');
    setIsParsing(false);
  };

  const handlePaste = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setJobDescription(text);
    
    if (text.length > 50) {
      setIsParsing(true);
      // Simulate AI parsing
      setTimeout(() => {
        // Mock extracted data
        const mockData = {
          title: text.match(/^(.*?)(?:\n|$)/)?.[1] || 'Software Engineer',
          location: text.match(/location[:\s]+([^\n]+)/i)?.[1] || 'Remote',
          skills: extractSkills(text),
          level: text.match(/(senior|junior|mid|lead)/i)?.[1] || 'Mid',
          industry: text.match(/(tech|finance|healthcare|education)/i)?.[1] || 'Tech',
        };
        
        setFormData({
          ...formData,
          ...mockData,
          description: text,
        });
        setIsParsing(false);
      }, 2000);
    }
  };

  const extractSkills = (text: string): string[] => {
    const commonSkills = ['Python', 'JavaScript', 'React', 'Node.js', 'AWS', 'Docker', 'Kubernetes', 'PostgreSQL', 'MongoDB', 'TypeScript', 'Django', 'Flask'];
    const found: string[] = [];
    commonSkills.forEach(skill => {
      if (text.toLowerCase().includes(skill.toLowerCase())) {
        found.push(skill);
      }
    });
    return found.slice(0, 5);
  };

  const handleAddSkill = () => {
    if (skillInput.trim() && !formData.skills.includes(skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, skillInput.trim()],
      });
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill),
    });
  };

  const handleSave = () => {
    if (formData.title && formData.location) {
      onSave({
        ...formData,
        description: jobDescription,
      });
      resetForm();
      onClose();
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setJobDescription(text);
        handlePaste({ target: { value: text } } as any);
      };
      reader.readAsText(file);
    }
  };

  const isFormValid = formData.title && formData.location;

  return (
    <Dialog open={open} onClose={onClose} title={editingJob ? 'Edit Job Posting' : 'Add New Job Posting'}>
      <div className="space-y-6">
        {/* Textarea for job description */}
        <div>
          <textarea
            value={jobDescription}
            onChange={handlePaste}
            placeholder="Paste your job description here..."
            className="w-full min-h-[300px] bg-white/5 border border-purple-500/30 rounded-xl p-4 text-white placeholder:text-[#e0e7ff]/60 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none"
          />
        </div>

        {/* OR divider */}
        {!jobDescription && (
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-gradient-to-br from-[#1a0b2e] to-[#2d1b4e] text-purple-300">or upload file</span>
            </div>
          </div>
        )}

        {/* File upload zone */}
        {!jobDescription && (
          <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-500/10 transition-all duration-300">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 mb-2 text-purple-400" />
              <p className="mb-2 text-sm text-[#e0e7ff]">
                <span className="font-semibold">Drop JD file here</span> or click to browse
              </p>
              <p className="text-xs text-purple-300">PDF, DOCX, TXT (MAX. 5MB)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileUpload}
            />
          </label>
        )}

        {/* AI Parsing indicator */}
        {isParsing && (
          <div className="flex items-center justify-center py-8">
            <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-purple-300">AI Parsing job description...</p>
            </div>
          </div>
        )}

        {/* Extracted fields */}
        {!isParsing && (formData.title || formData.location || formData.skills.length > 0) && (
          <div className="space-y-4 pt-4 border-t border-white/10">
            {/* Job Title */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Job Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                placeholder="e.g., Senior Backend Engineer"
              />
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                placeholder="e.g., San Francisco, CA or Remote"
              />
            </div>

            {/* Skills */}
            <div>
              <label className="block text-sm font-medium text-purple-300 mb-2">Skills</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSkill()}
                  className="flex-1 bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  placeholder="Add a skill and press Enter"
                />
                <button
                  onClick={handleAddSkill}
                  className="px-4 py-2 bg-purple-500/20 border border-purple-500 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full text-sm text-purple-200"
                  >
                    {skill}
                    <button
                      onClick={() => handleRemoveSkill(skill)}
                      className="hover:text-white transition-colors"
                      aria-label={`Remove ${skill}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Level and Industry */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Level</label>
                <input
                  type="text"
                  value={formData.level}
                  onChange={(e) => setFormData({ ...formData, level: e.target.value })}
                  className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  placeholder="e.g., Senior"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Industry</label>
                <input
                  type="text"
                  value={formData.industry}
                  onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                  className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  placeholder="e.g., Tech"
                />
              </div>
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-2 text-[#e0e7ff] hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!isFormValid}
            className="px-6 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(124,58,237,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
          >
            {editingJob ? 'Update Job' : 'Save Job'}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default AddJobModal;

