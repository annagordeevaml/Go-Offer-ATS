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
  const [extractedSkills, setExtractedSkills] = useState<string[]>([]);
  const [originalSkills, setOriginalSkills] = useState<string[]>([]); // Skills explicitly found in text
  const [analogueSkills, setAnalogueSkills] = useState<string[]>([]); // Analogues/competitors added automatically
  const [isExtractingSkills, setIsExtractingSkills] = useState(false);
  const [highlightedText, setHighlightedText] = useState<string>('');
  const [skillInput, setSkillInput] = useState<string>('');

  useEffect(() => {
    if (!open) {
      // Reset when modal closes
      resetForm();
      return;
    }

    // Only initialize when opening modal
    if (editingJob) {
      const cleanedDescription = cleanMarkdown(editingJob.description || '');
      
      setFormData({
        title: editingJob.title || '',
        location: editingJob.location || '',
        locations: editingJob.locations || [],
        skills: editingJob.skills || [],
        industry: Array.isArray(editingJob.industry) ? editingJob.industry.join(', ') : (editingJob.industry || ''),
        companyName: editingJob.companyName || '',
        consideringRelocation: editingJob.consideringRelocation || false,
        acceptsRemoteCandidates: editingJob.acceptsRemoteCandidates || false,
        description: cleanedDescription,
        workplaceType: editingJob.workplaceType || 'Remote',
        employmentType: editingJob.employmentType || 'Full-time',
        seniorityLevel: editingJob.seniorityLevel || 'Not Applicable',
      });
      setJobDescriptionText(cleanedDescription);
      
      // Use existing hard_skills if available, otherwise extract
      const existingHardSkills = (editingJob as any)?.hardSkills || editingJob?.skills || [];
      if (existingHardSkills.length > 0 && cleanedDescription) {
        setExtractedSkills(existingHardSkills);
        const { original, analogues } = separateOriginalAndAnalogueSkills(cleanedDescription, existingHardSkills);
        setOriginalSkills(original);
        setAnalogueSkills(analogues);
        setFormData(prev => ({
          ...prev,
          skills: existingHardSkills,
        }));
        updateHighlightedText(cleanedDescription, existingHardSkills);
      } else if (cleanedDescription) {
        // Extract skills if not already in database
        handleExtractSkillsForExistingJob(cleanedDescription);
      }
      
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
      setExtractedSkills([]);
      setOriginalSkills([]);
      setAnalogueSkills([]);
      setHighlightedText('');
      setSkillInput('');
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

      // Clean markdown from text
      const cleanedText = cleanMarkdown(text);
      setJobDescriptionText(cleanedText);
      
      // Parse basic info
      try {
        const { data: parsedBasic } = await parseBasicJobInfo(cleanedText);
        
        setFormData(prev => ({
          ...prev,
          title: prev?.title || parsedBasic.job_title || '',
          location: prev?.location || parsedBasic.location || '',
          companyName: prev?.companyName || parsedBasic.company_name || '',
          description: cleanedText,
        }));
      } catch (error) {
        console.error('Error parsing basic info:', error);
        setFormData(prev => ({
          ...prev,
          description: cleanedText,
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

      // Clean markdown from job description before parsing
      const cleanedDescription = cleanMarkdown(jobDescriptionText);
      
      const { data: validated, rawJson: jsonResponse } = await validateAndStandardizeJobData(
        formData.title,
        formData.companyName || '',
        formData.location,
        cleanedDescription
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
        description: cleanedValidatedDescription,
        unifiedTitles: validated.unified_titles || [],
        workplaceType: validated.workplace_type,
        employmentType: validated.employment_type || 'Full-time',
        seniorityLevel: validated.seniority_level || 'Not Applicable',
      };

        // Clean markdown from validated description
        const cleanedValidatedDescription = cleanMarkdown(validated.job_description);
        
        // Extract skills and highlight them
        // normalizeJobSkills extracts skills from ALL sections: Hard Skills, Software & Tools, Methodologies, Soft Skills
        let extractedSkillsList: string[] = [];
        try {
          const { normalizeJobSkills } = await import('../services/skillsNormalization');
          extractedSkillsList = await normalizeJobSkills('temp', cleanedValidatedDescription);
          console.log('Extracted skills from all sections:', {
            total: extractedSkillsList.length,
            preview: extractedSkillsList.slice(0, 20)
          });
          setExtractedSkills(extractedSkillsList);
          
          // Separate original skills from analogues (only for UI visualization)
          const { original, analogues } = separateOriginalAndAnalogueSkills(cleanedValidatedDescription, extractedSkillsList);
          setOriginalSkills(original);
          setAnalogueSkills(analogues);
          
          updateHighlightedText(cleanedValidatedDescription, extractedSkillsList);
        } catch (error) {
          console.error('Error extracting skills during parse:', error);
          // Continue without skills extraction
        }
      
      // Merge extracted skills with existing skills
      // extractedSkillsList contains ALL skills from all sections (Hard Skills, Software & Tools, Methodologies, Soft Skills)
      const mergedSkills = [...new Set([...updatedFormData.skills, ...extractedSkillsList])];
      
      setFormData({
        ...updatedFormData,
        skills: mergedSkills,
      });
      
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

  const handleExtractSkills = async () => {
    if (!jobDescriptionText.trim()) {
      alert('Please provide a job description first');
      return;
    }

    setIsExtractingSkills(true);
    try {
      const { normalizeJobSkills } = await import('../services/skillsNormalization');
      const skills = await normalizeJobSkills('temp', jobDescriptionText);
      setExtractedSkills(skills);
      
      // Separate original skills (found in text) from analogues
      const { original, analogues } = separateOriginalAndAnalogueSkills(jobDescriptionText, skills);
      setOriginalSkills(original);
      setAnalogueSkills(analogues);
      
      updateHighlightedText(jobDescriptionText, skills);
    } catch (error) {
      console.error('Error extracting skills:', error);
      alert('Failed to extract skills. Please try again.');
    } finally {
      setIsExtractingSkills(false);
    }
  };

  const cleanMarkdown = (text: string): string => {
    if (!text) return '';
    
    return text
      // Remove markdown headers (# ## ###)
      .replace(/^#{1,6}\s+/gm, '')
      // Remove bold (**text** or __text__)
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/__([^_]+)__/g, '$1')
      // Remove italic (*text* or _text_)
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/_([^_]+)_/g, '$1')
      // Remove links [text](url)
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Remove images ![alt](url)
      .replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
      // Remove code blocks ```
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code `code`
      .replace(/`([^`]+)`/g, '$1')
      // Remove strikethrough ~~text~~
      .replace(/~~([^~]+)~~/g, '$1')
      // Remove horizontal rules --- or ***
      .replace(/^[-*]{3,}$/gm, '')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      // Clean up multiple newlines
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  };

  const handleExtractSkillsForExistingJob = async (description: string) => {
    if (!description.trim()) return;
    
    try {
      const { normalizeJobSkills } = await import('../services/skillsNormalization');
      const skills = await normalizeJobSkills('temp', description);
      setExtractedSkills(skills);
      
      // Separate original skills from analogues
      const { original, analogues } = separateOriginalAndAnalogueSkills(description, skills);
      setOriginalSkills(original);
      setAnalogueSkills(analogues);
      
      // Update formData skills with extracted skills
      setFormData(prev => ({
        ...prev,
        skills: [...new Set([...prev.skills, ...skills])]
      }));
      
      updateHighlightedText(description, skills);
    } catch (error) {
      console.error('Error extracting skills for existing job:', error);
      // Continue without skills extraction
    }
  };

  const separateOriginalAndAnalogueSkills = (text: string, allSkills: string[]): { original: string[], analogues: string[] } => {
    const textLower = text.toLowerCase();
    const original: string[] = [];
    const analogues: string[] = [];
    
    allSkills.forEach(skill => {
      // Check if skill appears in the original text (case-insensitive)
      const skillRegex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (skillRegex.test(textLower)) {
        original.push(skill);
      } else {
        analogues.push(skill);
      }
    });
    
    return { original, analogues };
  };

  const updateHighlightedText = (text: string, skills: string[]) => {
    if (!text || skills.length === 0) {
      setHighlightedText('');
      return;
    }

    let highlighted = text;
    // Sort skills by length (longest first) to avoid partial matches
    const sortedSkills = [...skills].sort((a, b) => b.length - a.length);
    
    sortedSkills.forEach(skill => {
      // Create regex to match the skill (case-insensitive, word boundaries)
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      highlighted = highlighted.replace(regex, (match) => {
        return `<mark class="bg-yellow-400/30 text-yellow-200 px-1 rounded">${match}</mark>`;
      });
    });

    setHighlightedText(highlighted);
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

    // Merge all skills: extracted skills (from all sections) + manually added
    // extractedSkills already contains all skills from Hard Skills, Software & Tools, Methodologies, Soft Skills
    const allHardSkills = [...new Set([...extractedSkills, ...formData.skills.filter(s => !extractedSkills.includes(s))])];
    
    console.log('Saving hard_skills:', {
      extractedSkillsCount: extractedSkills.length,
      manuallyAddedCount: formData.skills.filter(s => !extractedSkills.includes(s)).length,
      totalHardSkills: allHardSkills.length,
      preview: allHardSkills.slice(0, 10)
    });
    
    onSave({
      ...formData,
      locations: normalizedLocations,
      location: normalizedLocations[0] || formData.location, // Update main location field with normalized first location
      industry: industryArray,
      skills: allHardSkills,
      hardSkills: allHardSkills, // Save all hard skills (from all sections: Hard Skills, Software & Tools, Methodologies, Soft Skills)
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
              <div className="mb-2 flex items-center justify-between">
                <label className="block text-sm font-medium text-purple-300">Job Description</label>
                <div className="flex items-center gap-2">
                  {highlightedText && (
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightedText('');
                      }}
                      className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-200 rounded-lg transition-colors text-xs"
                    >
                      Edit Text
                    </button>
                  )}
                  {jobDescriptionText && (
                    <button
                      type="button"
                      onClick={handleExtractSkills}
                      disabled={isExtractingSkills}
                      className="px-4 py-1.5 bg-purple-500/30 hover:bg-purple-500/40 border border-purple-400/30 text-purple-200 rounded-lg transition-colors flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      {isExtractingSkills ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Extracting...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4" />
                          Extract Skills
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {/* Highlighted text display */}
              {highlightedText ? (
                <div 
                  className="w-full min-h-[300px] bg-white/5 border border-purple-500/30 rounded-xl p-4 text-white overflow-y-auto whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: highlightedText }}
                />
              ) : (
                <textarea
                  ref={textareaRef}
                  value={jobDescriptionText}
                  onChange={(e) => {
                    const cleanedText = cleanMarkdown(e.target.value);
                    setJobDescriptionText(cleanedText);
                    setHighlightedText(''); // Clear highlights when text changes
                    // Try to parse basic info if text is long enough
                    if (cleanedText.length > 50) {
                      parseBasicJobInfo(cleanedText).then(({ data }) => {
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
              )}
            </div>

            {/* Extracted Skills Section */}
            {extractedSkills.length > 0 && (
              <div className="bg-white/5 border border-purple-500/30 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-purple-300">Extracted Skills ({extractedSkills.length})</label>
                  <button
                    type="button"
                    onClick={() => {
                      setExtractedSkills([]);
                      setHighlightedText('');
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300"
                  >
                    Clear All
                  </button>
                </div>
                
                {/* Skills tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                  {extractedSkills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500/20 border border-green-400/50 text-green-200 rounded-lg text-sm"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => {
                          const newSkills = extractedSkills.filter((_, i) => i !== idx);
                          setExtractedSkills(newSkills);
                          const { original, analogues } = separateOriginalAndAnalogueSkills(jobDescriptionText, newSkills);
                          setOriginalSkills(original);
                          setAnalogueSkills(analogues);
                          updateHighlightedText(jobDescriptionText, newSkills);
                        }}
                        className="hover:text-white transition-colors"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add skill input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && skillInput.trim()) {
                        e.preventDefault();
                        const newSkill = skillInput.trim().toLowerCase();
                        const newSkills = [...extractedSkills, newSkill];
                        setExtractedSkills(newSkills);
                        const { original, analogues } = separateOriginalAndAnalogueSkills(jobDescriptionText, newSkills);
                        setOriginalSkills(original);
                        setAnalogueSkills(analogues);
                        setSkillInput('');
                        updateHighlightedText(jobDescriptionText, newSkills);
                      }
                    }}
                    className="flex-1 bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED] text-sm"
                    placeholder="Add skill manually (press Enter)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (skillInput.trim()) {
                        const newSkill = skillInput.trim().toLowerCase();
                        const newSkills = [...extractedSkills, newSkill];
                        setExtractedSkills(newSkills);
                        const { original, analogues } = separateOriginalAndAnalogueSkills(jobDescriptionText, newSkills);
                        setOriginalSkills(original);
                        setAnalogueSkills(analogues);
                        setSkillInput('');
                        updateHighlightedText(jobDescriptionText, newSkills);
                      }
                    }}
                    className="px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 border border-purple-400/30 text-purple-200 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

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
              {/* Job Description with highlighted skills */}
              {jobDescriptionText && (
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-purple-300">Job Description</label>
                    <button
                      type="button"
                      onClick={() => {
                        setHighlightedText('');
                      }}
                      className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/30 text-purple-200 rounded-lg transition-colors text-xs"
                    >
                      Edit Text
                    </button>
                  </div>
                  {highlightedText ? (
                    <div 
                      className="w-full min-h-[200px] max-h-[400px] bg-white/5 border border-purple-500/30 rounded-xl p-4 text-white overflow-y-auto whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: highlightedText }}
                    />
                  ) : (
                    <div className="w-full min-h-[200px] max-h-[400px] bg-white/5 border border-purple-500/30 rounded-xl p-4 text-white overflow-y-auto whitespace-pre-wrap">
                      {jobDescriptionText}
                    </div>
                  )}
                </div>
              )}
              
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
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && skillInput.trim()) {
                        e.preventDefault();
                        const newSkill = skillInput.trim().toLowerCase();
                        const newSkills = [...formData.skills, newSkill];
                        setFormData({ ...formData, skills: newSkills });
                        // Add to original skills if not already there
                        if (!originalSkills.includes(newSkill) && !analogueSkills.includes(newSkill)) {
                          setOriginalSkills([...originalSkills, newSkill]);
                        }
                        setSkillInput('');
                      }
                    }}
                    className="flex-1 bg-white/5 border border-purple-500/30 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    placeholder="Add skill manually (press Enter)"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (skillInput.trim()) {
                        const newSkill = skillInput.trim().toLowerCase();
                        const newSkills = [...formData.skills, newSkill];
                        setFormData({ ...formData, skills: newSkills });
                        // Add to original skills if not already there
                        if (!originalSkills.includes(newSkill) && !analogueSkills.includes(newSkill)) {
                          setOriginalSkills([...originalSkills, newSkill]);
                        }
                        setSkillInput('');
                      }
                    }}
                    className="px-4 py-2 bg-purple-500/30 hover:bg-purple-500/40 border border-purple-400/30 text-purple-200 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                {/* Original Skills (found in text) */}
                {originalSkills.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-purple-400 mb-2">Found in description ({originalSkills.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {originalSkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 border border-green-500/50 rounded-full text-sm text-green-200"
                        >
                          {skill}
                          <button
                            onClick={() => {
                              handleRemoveSkill(skill);
                              setOriginalSkills(originalSkills.filter((_, i) => i !== idx));
                            }}
                            className="hover:text-white transition-colors"
                            aria-label={`Remove ${skill}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Analogue Skills (competitors/synonyms) */}
                {analogueSkills.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-purple-400 mb-2">Analogues & Competitors ({analogueSkills.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {analogueSkills.map((skill, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full text-sm text-blue-200"
                        >
                          {skill}
                          <button
                            onClick={() => {
                              handleRemoveSkill(skill);
                              setAnalogueSkills(analogueSkills.filter((_, i) => i !== idx));
                            }}
                            className="hover:text-white transition-colors"
                            aria-label={`Remove ${skill}`}
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Manually added skills (not in original or analogues) */}
                {formData.skills.filter(s => !originalSkills.includes(s) && !analogueSkills.includes(s)).length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-purple-400 mb-2">Manually Added ({formData.skills.filter(s => !originalSkills.includes(s) && !analogueSkills.includes(s)).length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {formData.skills.filter(s => !originalSkills.includes(s) && !analogueSkills.includes(s)).map((skill, idx) => (
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
                )}
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
