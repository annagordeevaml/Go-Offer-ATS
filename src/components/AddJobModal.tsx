import React, { useState, useRef, useEffect } from 'react';
import { X, Upload, Loader2, Save, AlertCircle, FileText, Plus, Globe } from 'lucide-react';
import Dialog from './Dialog';
import { JobFormData } from '../types';
import { parseBasicJobInfo, validateAndStandardizeJobData } from '../services/jobDescriptionParserService';
import mammoth from 'mammoth';
import { standardizeLocations } from '../utils/locationStandardizer';
import CustomSelect from './CustomSelect';

interface AddJobModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (jobData: JobFormData) => void;
  editingJob?: JobFormData | null;
}

const AddJobModal: React.FC<AddJobModalProps> = ({ open, onClose, onSave, editingJob }) => {
  const [step, setStep] = useState<'upload' | 'editing'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  const [jobDescriptionText, setJobDescriptionText] = useState<string>('');
  const [formData, setFormData] = useState<JobFormData>({
    title: '',
    location: '',
    locations: [],
    skills: [],
    industry: '',
    companyName: '',
    consideringRelocation: false,
    acceptsRemoteCandidates: false,
    workplaceType: 'Remote',
    employmentType: 'Full-time',
    seniorityLevel: 'Not Applicable',
  });
  const [locationInput, setLocationInput] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [validationError, setValidationError] = useState<{ title: string; message: string; missingFields: string[] } | null>(null);
  const [newIndustryInput, setNewIndustryInput] = useState<string>('');
  const [rawJson, setRawJson] = useState<string>('');

  useEffect(() => {
    if (!open) {
      // Reset when modal closes
      resetForm();
      return;
    }

    // Only initialize when opening modal
    if (editingJob) {
      setFormData({
        title: editingJob.title || '',
        location: editingJob.location || '',
        locations: editingJob.locations || [],
        skills: editingJob.skills || [],
        industry: Array.isArray(editingJob.industry) ? editingJob.industry.join(', ') : (editingJob.industry || ''),
        companyName: editingJob.companyName || '',
        consideringRelocation: editingJob.consideringRelocation || false,
        acceptsRemoteCandidates: editingJob.acceptsRemoteCandidates || false,
        description: editingJob.description || '',
        workplaceType: editingJob.workplaceType || 'Remote',
        employmentType: editingJob.employmentType || 'Full-time',
        seniorityLevel: editingJob.seniorityLevel || 'Not Applicable',
      });
      setJobDescriptionText(editingJob.description || '');
      setStep('editing');
    } else if (!jobDescriptionText && !formData.title) {
      // Only reset when opening fresh modal without any data
      setStep('upload');
    }
    // Don't reset step if we're already in editing mode or have data
  }, [open, editingJob]);

  const resetForm = () => {
    setJobDescriptionText('');
    setFormData({
      title: '',
      location: '',
      locations: [],
      skills: [],
      industry: '',
      companyName: '',
      consideringRelocation: false,
      acceptsRemoteCandidates: false,
      workplaceType: 'Remote',
      employmentType: 'Full-time',
      seniorityLevel: 'Not Applicable',
    });
    setLocationInput('');
    setJobDescriptionFile(null);
    setNewIndustryInput('');
    setIsLoading(false);
    setValidationError(null);
    setRawJson('');
    setStep('upload'); // Reset step when form is reset
  };

  const convertDocxToText = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      console.error('Error converting DOCX to text:', error);
      throw error;
    }
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx') && !file.name.endsWith('.pdf')) {
      alert('Please upload a .docx or .pdf file');
      return;
    }

    setJobDescriptionFile(file);
    setIsLoading(true);

    try {
      let text = '';
      if (file.name.endsWith('.docx')) {
        text = await convertDocxToText(file);
      } else {
        alert('PDF parsing is not yet supported. Please use .docx or paste text directly.');
        setIsLoading(false);
        return;
      }

      setJobDescriptionText(text);
      
      // Parse basic info
      try {
        const { data: parsedBasic } = await parseBasicJobInfo(text);
        
        setFormData(prev => ({
          ...prev,
          title: prev?.title || parsedBasic.job_title || '',
          location: prev?.location || parsedBasic.location || '',
          companyName: prev?.companyName || parsedBasic.company_name || '',
          description: text,
        }));
      } catch (error) {
        console.error('Error parsing basic info:', error);
        setFormData(prev => ({
          ...prev,
          description: text,
        }));
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error processing file:', error);
      setIsLoading(false);
      alert('Error processing file. Please try again.');
    }
  };

  const handleParseAndContinue = async () => {
    if (!jobDescriptionText.trim()) {
      alert('Please provide a job description');
      return;
    }

    if (!formData.title || !formData.location || !formData.companyName) {
      alert('Please fill in Job Title, Company Name, and Location before continuing');
      return;
    }

    setIsLoading(true);
    setValidationError(null);

    try {
      console.log('Starting parse and continue...', {
        title: formData.title,
        companyName: formData.companyName,
        location: formData.location,
        descriptionLength: jobDescriptionText.length,
      });

      const { data: validated, rawJson: jsonResponse } = await validateAndStandardizeJobData(
        formData.title,
        formData.companyName || '',
        formData.location,
        jobDescriptionText
      );

      console.log('Parsing completed successfully', validated);

      setRawJson(jsonResponse);

      // Parse industry (comma-separated string to array)
      const industries = validated.company_industry
        ? validated.company_industry.split(',').map(i => i.trim()).filter(i => i.length > 0)
        : [];

      // Parse hard skills (comma-separated string to array)
      const hardSkills = validated.hard_skills_mentioned_in_job_description
        ? validated.hard_skills_mentioned_in_job_description.split(',').map(s => s.trim()).filter(s => s.length > 0)
        : [];

      console.log('Setting form data and switching to editing step...', {
        industries,
        hardSkills,
      });

      // Normalize location from parsed data using ChatGPT (LinkedIn format)
      const { normalizeLocation } = await import('../services/locationNormalization');
      let normalizedLocationValue = validated.location;
      try {
        normalizedLocationValue = await normalizeLocation(validated.location);
      } catch (error) {
        console.error('Error normalizing location from parsed data:', error);
        // Keep original if normalization fails
      }

      // Update form data first
      const updatedFormData = {
        ...formData,
        title: validated.job_title,
        companyName: validated.company_name,
        location: normalizedLocationValue, // Use normalized location
        locations: [normalizedLocationValue], // Use normalized location in array
        industry: industries.join(', '),
        skills: hardSkills,
        description: validated.job_description,
        unifiedTitles: validated.unified_titles || [],
        workplaceType: validated.workplace_type,
        employmentType: validated.employment_type || 'Full-time',
        seniorityLevel: validated.seniority_level || 'Not Applicable',
      };

      setFormData(updatedFormData);
      
      // Update step and loading state together
      setIsLoading(false);
      setStep('editing');
      
      console.log('Step changed to editing, form data updated:', updatedFormData);
    } catch (error) {
      console.error('Error validating job data:', error);
      setIsLoading(false);
      alert(`Failed to parse job description: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or fill in the fields manually.`);
      setValidationError({
        title: 'Parsing Error',
        message: `Failed to parse job description: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or fill in the fields manually.`,
        missingFields: [],
      });
    }
  };

  const handleAddIndustry = () => {
    if (newIndustryInput.trim()) {
      const currentIndustries = typeof formData.industry === 'string' 
        ? formData.industry.split(',').map(i => i.trim()).filter(i => i.length > 0)
        : (Array.isArray(formData.industry) ? formData.industry : []);
      
      if (!currentIndustries.includes(newIndustryInput.trim())) {
        setFormData({
          ...formData,
          industry: [...currentIndustries, newIndustryInput.trim()].join(', '),
        });
      }
      setNewIndustryInput('');
    }
  };

  const handleRemoveIndustry = (industryToRemove: string) => {
    const currentIndustries = typeof formData.industry === 'string' 
      ? formData.industry.split(',').map(i => i.trim()).filter(i => i.length > 0)
      : (Array.isArray(formData.industry) ? formData.industry : []);
    
    setFormData({
      ...formData,
      industry: currentIndustries.filter(ind => ind !== industryToRemove).join(', '),
    });
  };

  const handleRemoveSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill),
    });
  };

  const handleSave = async () => {
    if (!formData.title) {
      alert('Please fill in Job Title');
      return;
    }

    if (!formData.locations || formData.locations.length === 0) {
      alert('Please add at least one location');
      return;
    }

    // Normalize locations using ChatGPT to LinkedIn format before saving
    const { normalizeLocation } = await import('../services/locationNormalization');
    const normalizedLocations = await Promise.all(
      formData.locations.map(async (loc) => {
        try {
          const normalized = await normalizeLocation(loc);
          return normalized || loc; // Fallback to original if normalization fails
        } catch (error) {
          console.error('Error normalizing location:', error);
          return loc; // Fallback to original
        }
      })
    );

    // Convert industry string to array
    const industryArray = formData.industry 
      ? (typeof formData.industry === 'string' 
          ? formData.industry.split(',').map(i => i.trim()).filter(i => i.length > 0)
          : (Array.isArray(formData.industry) ? formData.industry : []))
      : [];

    onSave({
      ...formData,
      locations: normalizedLocations,
      location: normalizedLocations[0] || formData.location, // Update main location field with normalized first location
      industry: industryArray,
      description: jobDescriptionText,
    });
    resetForm();
    onClose();
  };

  const industriesArray = typeof formData.industry === 'string' 
    ? formData.industry.split(',').map(i => i.trim()).filter(i => i.length > 0)
    : (Array.isArray(formData.industry) ? formData.industry : []);


  return (
    <Dialog open={open} onClose={onClose} title={editingJob ? 'Edit Job Posting' : 'Add New Job Posting'}>
      <div className="space-y-6">
        {step === 'upload' ? (
          <>
            {/* Textarea for job description */}
            <div>
              <textarea
                ref={textareaRef}
                value={jobDescriptionText}
                onChange={(e) => {
                  setJobDescriptionText(e.target.value);
                  // Try to parse basic info if text is long enough
                  if (e.target.value.length > 50) {
                    parseBasicJobInfo(e.target.value).then(({ data }) => {
                      setFormData(prev => ({
                        ...prev,
                        title: prev.title || data.job_title || '',
                        location: prev.location || data.location || '',
                        companyName: prev.companyName || data.company_name || '',
                      }));
                    }).catch(() => {
                      // Ignore parsing errors on typing
                    });
                  }
                }}
                placeholder="Paste your job description here or upload a file..."
                className="w-full min-h-[300px] bg-white/5 border border-purple-500/30 rounded-xl p-4 text-white placeholder:text-[#e0e7ff]/60 focus:outline-none focus:ring-2 focus:ring-[#7C3AED] resize-none"
              />
            </div>

            {/* OR divider */}
            {!jobDescriptionText && (
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
            {!jobDescriptionText && (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-500/30 rounded-xl cursor-pointer hover:border-purple-500 hover:bg-purple-500/10 transition-all duration-300">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-8 h-8 mb-2 text-purple-400" />
                  <p className="mb-2 text-sm text-[#e0e7ff]">
                    <span className="font-semibold">Drop JD file here</span> or click to browse
                  </p>
                  <p className="text-xs text-purple-300">DOCX, TXT (MAX. 5MB)</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".docx,.txt"
                  onChange={handleFileSelect}
                />
              </label>
            )}

            {/* Basic fields for manual input */}
            {jobDescriptionText && (
              <div className="space-y-4 pt-4 border-t border-white/10">
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

                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Company Name</label>
                  <input
                    type="text"
                    value={formData.companyName || ''}
                    onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    placeholder="e.g., TechCorp Inc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-purple-300 mb-2">Locations</label>
                  
                  {/* Location tags */}
                  {formData.locations && formData.locations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {formData.locations.map((loc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-400/30 text-purple-200 rounded-lg text-sm"
                        >
                          {loc}
                          <button
                            type="button"
                            onClick={() => {
                              const newLocations = formData.locations?.filter((_, i) => i !== idx) || [];
                              setFormData({ ...formData, locations: newLocations });
                            }}
                            className="hover:text-white transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {/* Add location input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={locationInput}
                      onChange={(e) => setLocationInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && locationInput.trim()) {
                          e.preventDefault();
                          const newLocations = [...(formData.locations || []), locationInput.trim()];
                          setFormData({ ...formData, locations: newLocations });
                          setLocationInput('');
                        }
                      }}
                      className="flex-1 bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                      placeholder="e.g., San Francisco, CA (press Enter to add)"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        if (locationInput.trim()) {
                          // Standardize location before adding
                          const standardized = await standardizeLocations([locationInput.trim()]);
                          const newLocations = [...(formData.locations || []), ...standardized];
                          setFormData({ ...formData, locations: newLocations });
                          setLocationInput('');
                        }
                      }}
                      className="px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 border border-purple-400/30 text-purple-200 rounded-lg transition-colors flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                  <p className="text-xs text-purple-300/70 mt-1">Locations will be standardized automatically (e.g., "SF" → "San Francisco, CA")</p>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-purple-300">
                    <input
                      type="checkbox"
                      checked={formData.consideringRelocation || false}
                      onChange={(e) => setFormData({ ...formData, consideringRelocation: e.target.checked })}
                      className="rounded"
                    />
                    Considering Relocation?
                  </label>
                  <label className="flex items-center gap-2 text-sm font-medium text-purple-300">
                    <input
                      type="checkbox"
                      checked={formData.acceptsRemoteCandidates || false}
                      onChange={(e) => setFormData({ ...formData, acceptsRemoteCandidates: e.target.checked })}
                      className="rounded"
                    />
                    Accept Remote Candidates?
                  </label>
                </div>
              </div>
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="flex flex-col items-center gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-purple-300 font-semibold">Please wait</p>
                    <p className="text-purple-300">Parsing job description...</p>
                    <p className="text-purple-400 text-sm">It should take up to 60 sec</p>
                  </div>
                </div>
              </div>
            )}

            {/* Parse & Continue button */}
            {!isLoading && jobDescriptionText && formData.title && (formData.locations && formData.locations.length > 0 || formData.location) && formData.companyName && (
              <div className="flex justify-end">
                <button
                  onClick={handleParseAndContinue}
                  className="px-6 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(124,58,237,0.6)] transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                >
                  Parse & Continue
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Editing step - show all fields */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Job Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Company Name</label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                />
              </div>

              {/* Locations */}
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Locations</label>
                
                {/* Location tags */}
                {formData.locations && formData.locations.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.locations.map((loc, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-500/20 border border-purple-400/30 text-purple-200 rounded-lg text-sm"
                      >
                        {loc}
                        <button
                          type="button"
                          onClick={() => {
                            const newLocations = formData.locations?.filter((_, i) => i !== idx) || [];
                            setFormData({ ...formData, locations: newLocations });
                          }}
                          className="hover:text-white transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                
                {/* Add location input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={locationInput}
                    onChange={(e) => setLocationInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && locationInput.trim()) {
                        e.preventDefault();
                        const newLocations = [...(formData.locations || []), locationInput.trim()];
                        setFormData({ ...formData, locations: newLocations });
                        setLocationInput('');
                      }
                    }}
                    className="flex-1 bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    placeholder="e.g., San Francisco, CA (press Enter to add)"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      if (locationInput.trim()) {
                        // Standardize location before adding
                        const standardized = await standardizeLocations([locationInput.trim()]);
                        const newLocations = [...(formData.locations || []), ...standardized];
                        setFormData({ ...formData, locations: newLocations });
                        setLocationInput('');
                      }
                    }}
                    className="px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 border border-purple-400/30 text-purple-200 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add
                  </button>
                </div>
                <p className="text-xs text-purple-300/70 mt-1">Locations will be standardized automatically (e.g., "SF" → "San Francisco, CA")</p>
              </div>

              {/* Workplace Type */}
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Workplace type *</label>
                <CustomSelect
                  value={formData.workplaceType || 'Remote'}
                  onChange={(value) => setFormData({ ...formData, workplaceType: value as any })}
                  options={[
                    { value: 'Remote', label: 'Remote' },
                    { value: 'On-site', label: 'On-site' },
                    { value: 'Hybrid', label: 'Hybrid' },
                  ]}
                  placeholder="Select workplace type"
                />
              </div>

              {/* Employment Type */}
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Employment type *</label>
                <CustomSelect
                  value={formData.employmentType || 'Full-time'}
                  onChange={(value) => setFormData({ ...formData, employmentType: value as any })}
                  options={[
                    { value: 'Full-time', label: 'Full-time' },
                    { value: 'Part-time', label: 'Part-time' },
                    { value: 'Contract', label: 'Contract' },
                    { value: 'Temporary', label: 'Temporary' },
                    { value: 'Internship', label: 'Internship' },
                  ]}
                  placeholder="Select employment type"
                />
              </div>

              {/* Seniority Level */}
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Seniority level *</label>
                <CustomSelect
                  value={formData.seniorityLevel || 'Not Applicable'}
                  onChange={(value) => setFormData({ ...formData, seniorityLevel: value as any })}
                  options={[
                    { value: 'Not Applicable', label: 'Not Applicable' },
                    { value: 'Internship', label: 'Internship' },
                    { value: 'Entry level', label: 'Entry level' },
                    { value: 'Associate', label: 'Associate' },
                    { value: 'Mid-Senior level', label: 'Mid-Senior level' },
                    { value: 'Director', label: 'Director' },
                    { value: 'Executive', label: 'Executive' },
                  ]}
                  placeholder="Select seniority level"
                />
              </div>

              {/* Industries */}
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Industries</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newIndustryInput}
                    onChange={(e) => setNewIndustryInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddIndustry()}
                    className="flex-1 bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    placeholder="Add industry"
                  />
                  <button
                    onClick={handleAddIndustry}
                    className="px-4 py-2 bg-purple-500/20 border border-purple-500 rounded-lg text-purple-300 hover:bg-purple-500/30 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {industriesArray.map((ind, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded-full text-sm text-cyan-200"
                    >
                      {ind}
                      <button
                        onClick={() => handleRemoveIndustry(ind)}
                        className="hover:text-white transition-colors"
                        aria-label={`Remove ${ind}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Hard Skills */}
              <div>
                <label className="block text-sm font-medium text-purple-300 mb-2">Hard Skills</label>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, idx) => (
                    <span
                      key={idx}
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

            </div>

            {/* Footer buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
              <button
                onClick={() => setStep('upload')}
                className="px-6 py-2 text-[#e0e7ff] hover:text-white transition-colors"
              >
                Back
              </button>
              <button
                onClick={onClose}
                className="px-6 py-2 text-[#e0e7ff] hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!formData.title || !formData.location}
                className="px-6 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white font-semibold rounded-lg hover:shadow-[0_0_20px_rgba(124,58,237,0.6)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
              >
                <Save className="w-4 h-4 inline mr-2" />
                {editingJob ? 'Update Job' : 'Save Job'}
              </button>
            </div>
          </>
        )}
      </div>
    </Dialog>
  );
};

export default AddJobModal;
