import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Save, AlertCircle, FileText, Plus } from 'lucide-react';
import { JobDescription } from '../types';
import { parseBasicJobInfo, parseIndustryAndSkills, validateAndStandardizeJobData } from '../services/jobDescriptionParserService';
import mammoth from 'mammoth';

interface AddJobDescriptionModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (jobDescription: JobDescription) => void;
  editingJobDescription?: JobDescription | null;
}

const AddJobDescriptionModal: React.FC<AddJobDescriptionModalProps> = ({ 
  open, 
  onClose, 
  onSave, 
  editingJobDescription 
}) => {
  const [step, setStep] = useState<'upload' | 'editing'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [jobDescriptionFile, setJobDescriptionFile] = useState<File | null>(null);
  const [jobDescriptionText, setJobDescriptionText] = useState<string>('');
  const [jobDescriptionData, setJobDescriptionData] = useState<Partial<JobDescription> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [validationError, setValidationError] = useState<{ title: string; message: string; missingFields: string[] } | null>(null);
  const [newIndustryInput, setNewIndustryInput] = useState<string>('');
  const [newSkillInput, setNewSkillInput] = useState<string>('');

  // When editingJobDescription changes or modal opens, populate form with existing data
  React.useEffect(() => {
    if (open && editingJobDescription) {
      setJobDescriptionData(editingJobDescription);
      setStep('editing');
      setJobDescriptionText(editingJobDescription.jobDescription);
    } else if (open && !editingJobDescription) {
      setStep('upload');
      setJobDescriptionData(null);
      setJobDescriptionFile(null);
      setJobDescriptionText('');
      setNewIndustryInput('');
      setNewSkillInput('');
    }
  }, [open, editingJobDescription]);

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
        // For PDF, we would need a PDF parser library
        alert('PDF parsing is not yet supported. Please use .docx or paste text directly.');
        setIsLoading(false);
        return;
      }

      setJobDescriptionText(text);
      
      // Try to parse basic info, but don't overwrite if user already filled fields
      try {
        const { data: parsedBasic } = await parseBasicJobInfo(text);
        
        setJobDescriptionData(prev => ({
          ...prev,
          jobTitle: prev?.jobTitle || parsedBasic.job_title || '',
          location: prev?.location || parsedBasic.location || '',
          companyName: prev?.companyName || parsedBasic.company_name || '',
          jobDescription: text,
          consideringRelocation: prev?.consideringRelocation || false,
          industry: prev?.industry || [],
          hardSkills: prev?.hardSkills || [],
        }));
      } catch (error) {
        console.error('Error parsing basic info:', error);
        // If parsing fails, just set the description text
        setJobDescriptionData(prev => ({
          ...prev,
          jobDescription: text,
          jobTitle: prev?.jobTitle || '',
          location: prev?.location || '',
          companyName: prev?.companyName || '',
          consideringRelocation: prev?.consideringRelocation || false,
          industry: prev?.industry || [],
          hardSkills: prev?.hardSkills || [],
        }));
      }
    } catch (error) {
      console.error('Full error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error processing job description: ${errorMessage}\n\nPlease check the browser console for details.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleParseAndContinue = async () => {
    // Validate required fields
    if (!jobDescriptionData?.jobTitle || !jobDescriptionData?.companyName || !jobDescriptionData?.location) {
      setValidationError({
        title: 'Required Fields Missing',
        message: 'Please fill in Job Title, Company Name, and Location before continuing.',
        missingFields: [
          !jobDescriptionData?.jobTitle ? 'Job Title' : '',
          !jobDescriptionData?.companyName ? 'Company Name' : '',
          !jobDescriptionData?.location ? 'Location' : '',
        ].filter(Boolean) as string[],
      });
      return;
    }

    const text = jobDescriptionText.trim();
    if (!text) {
      alert('Please paste or upload the job description text');
      return;
    }

    setIsLoading(true);

    try {
      console.log('=== Step 1: Validating and Standardizing Job Data ===');
      
      // Step 1: Validate and standardize all user input through ChatGPT
      const { data: validatedData, rawJson } = await validateAndStandardizeJobData(
        jobDescriptionData.jobTitle || '',
        jobDescriptionData.companyName || '',
        jobDescriptionData.location || '',
        text
      );

      // Process hard skills - split comma-separated string into array
      let hardSkills: string[] = [];
      if (validatedData.hard_skills_mentioned_in_job_description) {
        const skillsStr = String(validatedData.hard_skills_mentioned_in_job_description);
        hardSkills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      console.log('=== Hard Skills Processing ===');
      console.log('Raw hard skills string:', validatedData.hard_skills_mentioned_in_job_description);
      console.log('Processed hard skills array:', hardSkills);

      // Process industries - split comma-separated string into array
      let industries: string[] = [];
      if (validatedData.company_industry) {
        const industryStr = String(validatedData.company_industry);
        industries = industryStr.split(',').map(i => i.trim()).filter(Boolean);
      }

      console.log('=== Updating Job Description Data ===');
      console.log('Validated Title:', validatedData.job_title);
      console.log('Validated Company:', validatedData.company_name);
      console.log('Validated Location:', validatedData.location);
      console.log('Industries:', industries);
      console.log('Hard Skills:', hardSkills);

      // Update job description with validated and standardized data
      setJobDescriptionData({
        jobTitle: validatedData.job_title,
        location: validatedData.location,
        companyName: validatedData.company_name,
        jobDescription: validatedData.job_description,
        consideringRelocation: jobDescriptionData.consideringRelocation || false,
        industry: industries,
        hardSkills: hardSkills,
        rawJson: rawJson,
        createdAt: new Date().toISOString().split('T')[0],
        status: 'active',
      });

      setStep('editing');
    } catch (error) {
      console.error('Full error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error processing job description: ${errorMessage}\n\nPlease check the browser console for details.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBasicInfoContinue = async () => {
    setIsLoading(true);

    try {
      const descriptionText = jobDescriptionData?.jobDescription || jobDescriptionText;
      
      if (!descriptionText.trim()) {
        alert('Job description text is required');
        setIsLoading(false);
        return;
      }

      // Parse industry and hard skills using basic info + description
      const { data: parsedData, rawJson } = await parseIndustryAndSkills(
        jobDescriptionData?.jobTitle || '',
        jobDescriptionData?.companyName || '',
        jobDescriptionData?.location || '',
        descriptionText
      );

      // Process hard skills - split comma-separated string into array
      let hardSkills: string[] = [];
      if (parsedData.hard_skills_mentioned_in_job_description) {
        const skillsStr = String(parsedData.hard_skills_mentioned_in_job_description);
        hardSkills = skillsStr.split(',').map(s => s.trim()).filter(Boolean);
      }
      
      console.log('=== Hard Skills Processing ===');
      console.log('Raw hard skills string:', parsedData.hard_skills_mentioned_in_job_description);
      console.log('Processed hard skills array:', hardSkills);

      // Process industries - split comma-separated string into array
      let industries: string[] = [];
      if (parsedData.company_industry) {
        const industryStr = String(parsedData.company_industry);
        industries = industryStr.split(',').map(i => i.trim()).filter(Boolean);
      }

      console.log('=== Updating Job Description Data ===');
      console.log('Industries:', industries);
      console.log('Hard Skills:', hardSkills);

      // Update job description with industry and skills
      setJobDescriptionData(prev => {
        const updated = {
          ...prev,
          industry: industries,
          hardSkills: hardSkills,
          rawJson: rawJson,
        };
        console.log('Updated job description data:', updated);
        return updated;
      });

      setStep('editing');
    } catch (error) {
      console.error('Full error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error parsing industry and skills: ${errorMessage}\n\nPlease check the browser console for details.`);
    } finally {
      setIsLoading(false);
    }
  };

  const updateJobDescriptionField = (field: keyof JobDescription, value: any) => {
    setJobDescriptionData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = () => {
    if (!jobDescriptionData) return;

    // Collect all missing required fields
    const missingFields: string[] = [];

    if (!jobDescriptionData.jobTitle || jobDescriptionData.jobTitle.trim() === '') {
      missingFields.push('Job Title');
    }
    if (!jobDescriptionData.location || jobDescriptionData.location.trim() === '') {
      missingFields.push('Location');
    }
    if (!jobDescriptionData.companyName || jobDescriptionData.companyName.trim() === '') {
      missingFields.push('Company Name');
    }

    if (missingFields.length > 0) {
      setValidationError({
        title: 'Required Fields Missing',
        message: 'Please fill in all required fields before saving the job description.',
        missingFields: missingFields,
      });
      return;
    }

    const newJobDescription: JobDescription = {
      id: editingJobDescription?.id || Date.now(),
      jobTitle: jobDescriptionData.jobTitle || '',
      location: jobDescriptionData.location || '',
      jobDescription: jobDescriptionData.jobDescription || jobDescriptionText, // Keep full text
      companyName: jobDescriptionData.companyName || '',
      consideringRelocation: jobDescriptionData.consideringRelocation || false,
      industry: Array.isArray(jobDescriptionData.industry) ? jobDescriptionData.industry : 
                (jobDescriptionData.industry ? [jobDescriptionData.industry] : []),
      hardSkills: jobDescriptionData.hardSkills || [],
      createdAt: jobDescriptionData.createdAt || new Date().toISOString().split('T')[0],
      status: jobDescriptionData.status || 'active',
      rawJson: jobDescriptionData.rawJson || editingJobDescription?.rawJson,
    };

    onSave(newJobDescription);
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setJobDescriptionFile(null);
    setJobDescriptionText('');
    setJobDescriptionData(null);
    setValidationError(null);
    setNewIndustryInput('');
    setNewSkillInput('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const handleBack = () => {
    if (step === 'editing') {
      setStep('upload');
    }
  };

  const handleAddIndustry = () => {
    const industry = newIndustryInput.trim();
    if (industry) {
      const currentIndustries = Array.isArray(jobDescriptionData?.industry) ? jobDescriptionData.industry : [];
      if (!currentIndustries.includes(industry)) {
        updateJobDescriptionField('industry', [...currentIndustries, industry]);
        setNewIndustryInput('');
      }
    }
  };

  const handleAddSkill = () => {
    const skill = newSkillInput.trim();
    if (skill) {
      const currentSkills = Array.isArray(jobDescriptionData?.hardSkills) ? jobDescriptionData.hardSkills : [];
      if (!currentSkills.includes(skill)) {
        updateJobDescriptionField('hardSkills', [...currentSkills, skill]);
        setNewSkillInput('');
      }
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] p-6 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">
            {editingJobDescription ? 'Edit Job Description' : 'Review Job Description Details'}
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' ? (
            // Step 1: Upload job description + basic info fields
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Job Description & Basic Information</h3>
                
                {/* Basic Info Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {/* Job Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Job Title *</label>
                    <input
                      type="text"
                      value={jobDescriptionData?.jobTitle || ''}
                      onChange={(e) => updateJobDescriptionField('jobTitle', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                      placeholder="e.g. Senior Backend Engineer"
                    />
                  </div>

                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company Name *</label>
                    <input
                      type="text"
                      value={jobDescriptionData?.companyName || ''}
                      onChange={(e) => updateJobDescriptionField('companyName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                      placeholder="e.g. Google"
                    />
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                    <input
                      type="text"
                      value={jobDescriptionData?.location || ''}
                      onChange={(e) => updateJobDescriptionField('location', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                      placeholder="e.g. San Francisco, CA"
                    />
                  </div>

                  {/* Considering Relocation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Considering Remote Candidates?</label>
                    <select
                      value={jobDescriptionData?.consideringRelocation ? 'yes' : 'no'}
                      onChange={(e) => updateJobDescriptionField('consideringRelocation', e.target.value === 'yes')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>
                </div>

                {/* File Upload Option */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Job Description File (.docx)
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isLoading}
                    className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#7C3AED] transition-colors flex items-center justify-center gap-2 text-gray-600 disabled:opacity-50"
                  >
                    <Upload className="w-5 h-5" />
                    {isLoading ? 'Processing...' : 'Choose File'}
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="text-sm text-gray-500">or</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                {/* Text Paste Option */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Paste Job Description Text
                  </label>
                  <textarea
                    ref={textareaRef}
                    value={jobDescriptionText}
                    onChange={(e) => setJobDescriptionText(e.target.value)}
                    placeholder="Paste the job description text here..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] min-h-[200px]"
                    rows={10}
                  />
                </div>
              </div>
            </div>
          ) : (
            // Step 2: Review and edit validated data
            <div className="space-y-4">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Job Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                  <input
                    type="text"
                    value={jobDescriptionData?.jobTitle || ''}
                    onChange={(e) => updateJobDescriptionField('jobTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-gray-50"
                  />
                </div>

                {/* Company Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                  <input
                    type="text"
                    value={jobDescriptionData?.companyName || ''}
                    onChange={(e) => updateJobDescriptionField('companyName', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-gray-50"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={jobDescriptionData?.location || ''}
                    onChange={(e) => updateJobDescriptionField('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED] bg-gray-50"
                  />
                </div>

                {/* Industry - as tags with delete option and add functionality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industries</label>
                  
                  {/* Add new industry input */}
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newIndustryInput}
                      onChange={(e) => setNewIndustryInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddIndustry();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                      placeholder="Type industry name and press Enter or click +"
                    />
                    <button
                      type="button"
                      onClick={handleAddIndustry}
                      disabled={!newIndustryInput.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      title="Add new industry"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                  
                  {/* Help text */}
                  <p className="text-xs text-gray-500 mb-2">
                    💡 Type an industry name above and click "Add" or press Enter to add it to the list
                  </p>

                  {/* Display industries as tags */}
                  {Array.isArray(jobDescriptionData?.industry) && jobDescriptionData.industry.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {jobDescriptionData.industry.map((ind, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 pr-1 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded text-xs flex items-center gap-1 group hover:bg-cyan-100 transition-colors"
                        >
                          {ind}
                          <button
                            type="button"
                            onClick={() => {
                              const updatedIndustries = jobDescriptionData.industry?.filter((_, i) => i !== idx) || [];
                              updateJobDescriptionField('industry', updatedIndustries);
                            }}
                            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-cyan-200 rounded-full p-0.5"
                            aria-label={`Remove ${ind}`}
                          >
                            <X className="w-3 h-3 text-cyan-700" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {(!jobDescriptionData?.industry || jobDescriptionData.industry.length === 0) && (
                    <p className="text-xs text-gray-400 italic mt-1">No industries added yet. Add your first industry above.</p>
                  )}
                </div>

                {/* Hard Skills - with add/delete functionality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hard Skills</label>
                  
                  {/* Add new skill input */}
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newSkillInput}
                      onChange={(e) => setNewSkillInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                      placeholder="Type skill name and press Enter or click +"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      disabled={!newSkillInput.trim()}
                      className="px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      title="Add new skill"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                  
                  {/* Help text */}
                  <p className="text-xs text-gray-500 mb-2">
                    💡 Type a skill name above and click "Add" or press Enter to add it to the list
                  </p>

                  {/* Display skills as tags */}
                  {Array.isArray(jobDescriptionData?.hardSkills) && jobDescriptionData.hardSkills.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {jobDescriptionData.hardSkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 pr-1 bg-purple-50 border border-purple-200 text-purple-700 rounded text-xs flex items-center gap-1 group hover:bg-purple-100 transition-colors"
                        >
                          {skill}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updatedSkills = jobDescriptionData.hardSkills?.filter((_, i) => i !== idx) || [];
                              updateJobDescriptionField('hardSkills', updatedSkills);
                            }}
                            className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-purple-200 rounded-full p-0.5"
                            aria-label={`Remove ${skill}`}
                          >
                            <X className="w-3 h-3 text-purple-700" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  
                  {(!jobDescriptionData?.hardSkills || jobDescriptionData.hardSkills.length === 0) && (
                    <p className="text-xs text-gray-400 italic mt-1">No skills added yet. Add your first skill above.</p>
                  )}
                </div>

                {/* Job Description - Full text, no shortening */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Job Description</label>
                  <textarea
                    value={jobDescriptionData?.jobDescription || jobDescriptionText}
                    onChange={(e) => {
                      updateJobDescriptionField('jobDescription', e.target.value);
                      setJobDescriptionText(e.target.value);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    rows={12}
                    placeholder="Full job description (keep all text as entered by recruiter)..."
                  />
                </div>

                {/* Raw JSON from ChatGPT - for debugging */}
                {jobDescriptionData?.rawJson && (
                  <div className="md:col-span-2 border-t border-gray-200 pt-4 mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      ChatGPT JSON Output (for debugging)
                    </label>
                    <textarea
                      value={jobDescriptionData.rawJson}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-xs font-mono"
                      rows={8}
                      style={{ fontSize: '11px' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'upload' && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-end">
            <button
              onClick={handleParseAndContinue}
              disabled={isLoading || !jobDescriptionText.trim()}
              className="px-6 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Parsing...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4" />
                  Parse & Continue
                </>
              )}
            </button>
          </div>
        )}
        {step === 'editing' && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-between">
            <button
              onClick={handleBack}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Find Super Star
            </button>
          </div>
        )}
      </div>

      {/* Validation Error Modal */}
      {validationError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 transform transition-all animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-red-500 to-orange-500 p-6 rounded-t-2xl">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white">{validationError.title}</h3>
              </div>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-gray-700 mb-4">{validationError.message}</p>
              
              {/* Missing Fields List */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-semibold text-red-800 mb-2">Missing Required Fields:</p>
                <ul className="space-y-2">
                  {validationError.missingFields.map((field, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-red-700">
                      <div className="w-1.5 h-1.5 bg-red-500 rounded-full"></div>
                      <span>{field}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <button
                onClick={() => setValidationError(null)}
                className="w-full px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg"
              >
                <X className="w-4 h-4" />
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AddJobDescriptionModal;

