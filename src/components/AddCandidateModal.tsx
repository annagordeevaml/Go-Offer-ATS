import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Save, AlertCircle } from 'lucide-react';
import { Candidate } from '../types';
import { UNIFIED_TITLES_SORTED, addRelatedTitles } from '../utils/unifiedTitlesMapping';
import { parseResumeWithAI, convertDocxToText, convertPdfToText, generateSummariesWithAllModels, reformatResumeWithTemplate } from '../services/resumeParserService';
import mammoth from 'mammoth';
import { extractContacts, removeContactsFromHtml, removeNameAndLocationFromHtml, formatResumeHtml } from '../utils/resumeParser';

interface AddCandidateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (candidate: Candidate) => void;
  editingCandidate?: Candidate | null; // Optional: if provided, opens in edit mode
}

const AddCandidateModal: React.FC<AddCandidateModalProps> = ({ open, onClose, onSave, editingCandidate }) => {
  const [step, setStep] = useState<'upload' | 'editing'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [candidateData, setCandidateData] = useState<Partial<Candidate> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<{ title: string; message: string; missingFields: string[] } | null>(null);

  // When editingCandidate changes or modal opens, populate form with existing data
  React.useEffect(() => {
    if (open && editingCandidate) {
      // Edit mode: populate form with existing candidate data
      setCandidateData(editingCandidate);
      setStep('editing');
      setResumeFile(editingCandidate.resume?.file || null);
    } else if (open && !editingCandidate) {
      // Add mode: reset form
      setStep('upload');
      setCandidateData(null);
      setResumeFile(null);
    }
  }, [open, editingCandidate]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isDocx = file.name.endsWith('.docx');
    const isPdf = file.name.endsWith('.pdf');

    if (!isDocx && !isPdf) {
      alert('Please upload a .docx or .pdf file');
      return;
    }

    setResumeFile(file);
    setIsLoading(true);

    try {
      // STEP 1: Convert file to text (DOCX or PDF)
      let resumeText: string;
      let htmlContent: string;

      if (isDocx) {
        // Convert DOCX to text
        resumeText = await convertDocxToText(file);
        
        // Convert DOCX to HTML for display
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        htmlContent = result.value;
      } else if (isPdf) {
        // Convert PDF to text for parsing
        resumeText = await convertPdfToText(file);
        
        // Convert PDF to HTML with precise formatting (NO ChatGPT reformatting)
        const { convertPdfToHtml } = await import('../services/resumeParserService');
        htmlContent = await convertPdfToHtml(file);
      } else {
        throw new Error('Unsupported file type');
      }
      
      // STEP 2: Parse resume with AI (now also reformats resume according to template)
      const { data: parsedData, rawJson: reformattedResumeText } = await parseResumeWithAI(resumeText);
      
      // STEP 2.5: Generate Summaries with GPT-3.5-turbo
      const summariesByModel = await generateSummariesWithAllModels(resumeText);
      // Use gpt-3.5-turbo as default summary
      const summary = summariesByModel['gpt-3.5-turbo'] || '';

      // Extract contacts for later use
      const contacts = extractContacts(htmlContent);

      // Use reformatted resume from ChatGPT if available, otherwise use original
      if (reformattedResumeText && reformattedResumeText.trim()) {
        // Convert reformatted text to HTML with proper formatting
        const formattedHtml = reformattedResumeText
          .split('\n')
          .map((line) => {
            const trimmedLine = line.trim();
            // Skip empty lines but add spacing
            if (!trimmedLine) return '<div style="height: 0.5em;"></div>';
            // Format section headers (all caps, bold, no special chars)
            if (trimmedLine === trimmedLine.toUpperCase() && 
                trimmedLine.length < 50 && 
                !trimmedLine.includes('│') && 
                !trimmedLine.includes('@') &&
                !trimmedLine.includes('http') &&
                trimmedLine.length > 3) {
              return `<h3 style="font-weight: bold; font-size: 1.2em; margin-top: 2em; margin-bottom: 1em; color: #1f2937; text-transform: uppercase; border-bottom: 2px solid #e5e7eb; padding-bottom: 0.5em;">${trimmedLine}</h3>`;
            }
            // Format header line (name, title, contact info)
            if (trimmedLine.includes('│') || (trimmedLine.includes('@') && trimmedLine.includes('http'))) {
              return `<p style="font-weight: 600; font-size: 1.05em; margin-top: 1.5em; margin-bottom: 0.5em; color: #374151; line-height: 1.8;">${trimmedLine}</p>`;
            }
            // Format company names and job titles (lines with dates)
            if (trimmedLine.match(/\d{4}/) && (trimmedLine.includes('–') || trimmedLine.includes('-'))) {
              return `<p style="font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; color: #4b5563; font-size: 1.05em;">${trimmedLine}</p>`;
            }
            // Format bullet points (lines starting with bullet or dash)
            if (trimmedLine.startsWith('•') || trimmedLine.startsWith('-') || trimmedLine.match(/^[A-Z][a-z].*:$/)) {
              return `<p style="margin-left: 2em; margin-bottom: 0.6em; line-height: 1.7; text-indent: -1em; padding-left: 1em;">${trimmedLine}</p>`;
            }
            // Format lines that look like achievements (start with action verb)
            if (trimmedLine.match(/^(Built|Launched|Developed|Created|Implemented|Led|Managed|Designed|Established|Scaled|Enhanced|Delivered|Organized)/i)) {
              return `<p style="margin-left: 1.5em; margin-bottom: 0.6em; line-height: 1.7;">${trimmedLine}</p>`;
            }
            // Regular paragraphs
            return `<p style="margin-bottom: 0.6em; line-height: 1.7; color: #374151;">${trimmedLine}</p>`;
          })
          .join('\n');
        
        htmlContent = `<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; padding: 30px; max-width: 900px; margin: 0 auto; background: #ffffff;">${formattedHtml}</div>`;
        console.log('Using reformatted resume from ChatGPT');
      } else {
        // Fallback to original formatting
        if (isDocx) {
          // Remove contacts from HTML
          htmlContent = removeContactsFromHtml(htmlContent, contacts);
          
          // Remove name and location from resume (they're already in the card)
          const fullName = parsedData.full_name || '';
          const location = parsedData.location || '';
          htmlContent = removeNameAndLocationFromHtml(htmlContent, fullName, location);
          
          // Format resume HTML for better display
          htmlContent = formatResumeHtml(htmlContent);
        } else if (isPdf) {
          // For PDF: Only remove contacts, name, and location
          htmlContent = removeContactsFromHtml(htmlContent, contacts);
          
          const fullName = parsedData.full_name || '';
          const location = parsedData.location || '';
          htmlContent = removeNameAndLocationFromHtml(htmlContent, fullName, location);
        }
      }

      
      // Map parsed data to candidate format
      // Ensure arrays are properly initialized
      const mainIndustries = Array.isArray(parsedData.main_industries) 
        ? parsedData.main_industries.filter(i => i && i.trim() !== '') 
        : [];
      const relatedIndustries = Array.isArray(parsedData.other_related_industries)
        ? parsedData.other_related_industries.filter(i => i && i.trim() !== '')
        : [];
      const companyNames = Array.isArray(parsedData.company_names)
        ? parsedData.company_names.filter(c => c && c.trim() !== '')
        : [];
      
      // Extract and normalize skills from parsed data
      let extractedSkills: string[] = [];
      if (Array.isArray(parsedData.skills) && parsedData.skills.length > 0) {
        extractedSkills = parsedData.skills.filter(s => s && s.trim() !== '');
      }
      
      // Normalize skills using ChatGPT (translate to English, lowercase, standardize)
      let normalizedSkills: string[] = [];
      if (extractedSkills.length > 0) {
        try {
          const { normalizeSkills } = await import('../services/skillsNormalization');
          normalizedSkills = await normalizeSkills(extractedSkills);
          console.log('Normalized skills:', normalizedSkills);
        } catch (normalizationError) {
          console.error('Error normalizing skills:', normalizationError);
          // Fallback: use extracted skills with basic normalization
          normalizedSkills = extractedSkills.map(s => s.trim().toLowerCase()).filter(s => s.length > 0);
        }
      }
      
      // Process LinkedIn - prioritize parsed data, fallback to extracted contacts
      let linkedinUrl = parsedData.linkedin && parsedData.linkedin !== 'Not found' ? parsedData.linkedin : null;
      if (!linkedinUrl && contacts.linkedin) {
        linkedinUrl = contacts.linkedin;
      }
      // Ensure LinkedIn URL is complete (add https:// if missing)
      if (linkedinUrl && !linkedinUrl.startsWith('http')) {
        linkedinUrl = `https://${linkedinUrl}`;
      }
      
      // Process email and phone - prioritize parsed data, fallback to extracted contacts
      const email = parsedData.email && parsedData.email !== 'Not found' 
        ? parsedData.email 
        : (contacts.email || null);
      const phone = parsedData.phone_number && parsedData.phone_number !== 'Not found'
        ? parsedData.phone_number
        : (contacts.phone || null);
      
      
      let unifiedTitles = Array.isArray(parsedData.unified_titles) 
        ? parsedData.unified_titles.filter(t => t && t.trim() !== '') 
        : [];
      
      // Add related titles for C-level positions (e.g., CMO → Marketing Manager)
      if (unifiedTitles.length > 0) {
        unifiedTitles = addRelatedTitles(unifiedTitles);
      }
      
      const newCandidate: Partial<Candidate> = {
        name: parsedData.full_name || '',
        jobTitle: parsedData.main_job_title || '',
        location: parsedData.location || 'Not specified',
        experience: `${parsedData.total_work_experience_years || 0} years`,
        availability: 'Available',
        readyToRelocateTo: [],
        lastUpdated: parsedData.last_updated_date || new Date().toISOString().split('T')[0],
        matchScore: 0,
        status: 'actively_looking',
        industries: mainIndustries,
        relatedIndustries: relatedIndustries,
        companyNames: companyNames,
        skills: normalizedSkills, // Use normalized skills from resume parsing
        summary: summary || '',
        unifiedTitles: unifiedTitles,
        summariesByModel: summariesByModel,
        socialLinks: {
          linkedin: linkedinUrl || undefined,
          github: parsedData.github && parsedData.github !== 'Not found' ? parsedData.github : undefined,
          portfolio: parsedData.portfolio && parsedData.portfolio !== 'Not found' ? parsedData.portfolio : undefined,
          otherSocialMedia: parsedData.other_social_media && parsedData.other_social_media !== 'Not found' ? parsedData.other_social_media : undefined,
        },
        resume: {
          file,
          htmlContent,
          contacts: {
            email,
            phone,
            linkedin: linkedinUrl,
          },
        },
      };

      // Debug: log parsed data

      
      
      setCandidateData(newCandidate);
      setStep('editing');
      
      
      // Force a re-render check
      setTimeout(() => {
      }, 100);
    } catch (error) {
      console.error('Full error details:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      alert(`Error processing resume: ${errorMessage}\n\nPlease check the browser console for details.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!candidateData) return;
    
    // Resume file is only required when adding a new candidate, not when editing
    if (!editingCandidate && !resumeFile) {
      setValidationError({
        title: 'Resume Required',
        message: 'Please upload a resume file before saving the candidate.',
        missingFields: ['Resume File'],
      });
      return;
    }

    // Collect all missing required fields
    const missingFields: string[] = [];

    // Check location
    if (!candidateData.location || candidateData.location.trim() === '') {
      missingFields.push('Location');
    }

    // Check LinkedIn
    let linkedinUrl = candidateData.socialLinks?.linkedin || candidateData.resume?.contacts?.linkedin;
    if (!linkedinUrl || linkedinUrl.trim() === '' || linkedinUrl === 'Not found') {
      missingFields.push('LinkedIn URL');
    }

    // Check Calendly
    const calendlyUrl = candidateData.calendly || candidateData.socialLinks?.calendly;
    if (!calendlyUrl || calendlyUrl.trim() === '') {
      missingFields.push('Calendly Link');
    }

    // If there are missing fields, show validation modal
    if (missingFields.length > 0) {
      setValidationError({
        title: 'Required Fields Missing',
        message: 'Please fill in all required fields before saving the candidate.',
        missingFields: missingFields,
      });
      return;
    }

    // Ensure LinkedIn is properly formatted
    if (!linkedinUrl.startsWith('http')) {
      linkedinUrl = `https://${linkedinUrl}`;
    }

    const newCandidate: Candidate = {
      id: editingCandidate?.id || Date.now(), // Use existing ID if editing
      name: candidateData.name || '',
      jobTitle: candidateData.jobTitle || '',
      location: candidateData.location || 'Not specified',
      experience: candidateData.experience || '0 years',
      availability: candidateData.availability || 'Available',
      readyToRelocateTo: candidateData.readyToRelocateTo || [],
      lastUpdated: candidateData.lastUpdated || new Date().toISOString().split('T')[0],
      matchScore: candidateData.matchScore || 0,
      status: candidateData.status || 'actively_looking',
      industries: candidateData.industries || [],
      relatedIndustries: candidateData.relatedIndustries || [],
      companyNames: candidateData.companyNames || [],
      skills: candidateData.skills || [],
      summary: candidateData.summary || '',
      summariesByModel: candidateData.summariesByModel || {},
      socialLinks: {
        ...candidateData.socialLinks,
        linkedin: linkedinUrl,
        calendly: calendlyUrl,
      },
      calendly: calendlyUrl,
      salaryMin: candidateData.salaryMin,
      salaryMax: candidateData.salaryMax,
      salaryUnit: candidateData.salaryUnit || 'year',
      resume: candidateData.resume ? {
        ...candidateData.resume,
        // Preserve existing file if editing, use new file if adding
        file: resumeFile || candidateData.resume.file,
        htmlContent: candidateData.resume.htmlContent,
        contacts: {
          email: candidateData.resume.contacts?.email || null,
          phone: candidateData.resume.contacts?.phone || null,
          linkedin: linkedinUrl || null,
        },
      } : (resumeFile ? {
        file: resumeFile,
        htmlContent: '', // Will be set if resume was uploaded
        contacts: {
          email: null,
          phone: null,
          linkedin: linkedinUrl || null,
        },
      } : undefined),
    };

    console.log('Saving candidate:', newCandidate);
    onSave(newCandidate);
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setResumeFile(null);
    setCandidateData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onClose();
  };

  const updateCandidateField = (field: keyof Candidate, value: any) => {
    setCandidateData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] p-4 rounded-t-xl flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">
            {editingCandidate ? 'Edit Candidate Information' : (step === 'upload' ? 'Add New Candidate' : 'Edit Candidate Information')}
          </h2>
          <button
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' ? (
            <div className="flex flex-col items-center justify-center py-12">
              {isLoading ? (
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-[#7C3AED] animate-spin mx-auto mb-4" />
                  <p className="text-gray-600">Processing resume with AI...</p>
                  <p className="text-sm text-gray-500 mt-2">This may take a few moments</p>
                </div>
              ) : (
                <>
                  <Upload className="w-16 h-16 text-[#7C3AED] mb-4" />
                  <h3 className="text-xl font-semibold text-gray-800 mb-2">Upload Resume</h3>
                  <p className="text-gray-600 mb-6 text-center">
                    Upload a .docx or .pdf resume file. We'll automatically extract candidate information using AI.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx,.pdf"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-6 py-3 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Upload className="w-5 h-5" />
                    Choose Resume File
                  </button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={candidateData?.name || ''}
                    onChange={(e) => updateCandidateField('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>

                {/* Job Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Main Job Title</label>
                  <input
                    type="text"
                    value={candidateData?.jobTitle || ''}
                    onChange={(e) => updateCandidateField('jobTitle', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <input
                    type="text"
                    value={candidateData?.location || ''}
                    onChange={(e) => updateCandidateField('location', e.target.value)}
                    placeholder="e.g., New York, NY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    required
                  />
                </div>

                {/* Total Work Experience Years */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Work Experience (Years)</label>
                  <input
                    type="text"
                    value={candidateData?.experience || ''}
                    onChange={(e) => updateCandidateField('experience', e.target.value)}
                    placeholder="e.g., 8 years"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>

                {/* Salary Min */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Min</label>
                  <input
                    type="text"
                    value={candidateData?.salaryMin || ''}
                    onChange={(e) => updateCandidateField('salaryMin', e.target.value)}
                    placeholder="e.g., 100000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>

                {/* Salary Max */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Max</label>
                  <input
                    type="text"
                    value={candidateData?.salaryMax || ''}
                    onChange={(e) => updateCandidateField('salaryMax', e.target.value)}
                    placeholder="e.g., 150000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>

                {/* Salary Unit */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salary Unit</label>
                  <select
                    value={candidateData?.salaryUnit || 'year'}
                    onChange={(e) => updateCandidateField('salaryUnit', e.target.value as 'year' | 'month' | 'hour')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  >
                    <option value="year">Per Year</option>
                    <option value="month">Per Month</option>
                    <option value="hour">Per Hour</option>
                  </select>
                </div>

                {/* Unified Titles */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unified Titles
                    {candidateData?.unifiedTitles && candidateData.unifiedTitles.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">({candidateData.unifiedTitles.length} found)</span>
                    )}
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {candidateData?.unifiedTitles?.map((title, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-purple-100 text-purple-800 rounded-lg text-sm font-medium"
                      >
                        {title}
                        <button
                          type="button"
                          onClick={() => {
                            const updated = candidateData.unifiedTitles?.filter((_, i) => i !== idx) || [];
                            updateCandidateField('unifiedTitles', updated);
                          }}
                          className="ml-1 text-purple-600 hover:text-purple-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const current = candidateData?.unifiedTitles || [];
                        if (!current.includes(e.target.value)) {
                          const newTitles = addRelatedTitles([...current, e.target.value]);
                          updateCandidateField('unifiedTitles', newTitles);
                        }
                        e.target.value = '';
                      }
                    }}
                    className="w-full px-4 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  >
                    <option value="">Add Unified Title...</option>
                    {UNIFIED_TITLES_SORTED.map((title: string) => (
                      <option key={title} value={title}>{title}</option>
                    ))}
                  </select>
                </div>

                {/* Main Industries */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Main Industries
                    {candidateData?.industries && candidateData.industries.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">({candidateData.industries.length} found)</span>
                    )}
                  </label>
                  <textarea
                    value={Array.isArray(candidateData?.industries) ? candidateData.industries.join(', ') : ''}
                    onChange={(e) => updateCandidateField('industries', e.target.value.split(',').map(i => i.trim()).filter(Boolean))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    rows={2}
                    placeholder="Enter main industries separated by commas"
                  />
                  {(!candidateData?.industries || candidateData.industries.length === 0) && (
                    <p className="text-xs text-yellow-600 mt-1">⚠️ No industries found in resume</p>
                  )}
                </div>

                {/* Other Related Industries */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Other Related Industries
                    {candidateData?.relatedIndustries && candidateData.relatedIndustries.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">({candidateData.relatedIndustries.length} found)</span>
                    )}
                  </label>
                  <textarea
                    value={Array.isArray(candidateData?.relatedIndustries) ? candidateData.relatedIndustries.join(', ') : ''}
                    onChange={(e) => updateCandidateField('relatedIndustries', e.target.value.split(',').map(i => i.trim()).filter(Boolean))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    rows={2}
                    placeholder="Enter related industries separated by commas"
                  />
                  {(!candidateData?.relatedIndustries || candidateData.relatedIndustries.length === 0) && (
                    <p className="text-xs text-yellow-600 mt-1">⚠️ No related industries found in resume</p>
                  )}
                </div>

                {/* LinkedIn */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LinkedIn URL *</label>
                  <input
                    type="url"
                    value={candidateData?.socialLinks?.linkedin || candidateData?.resume?.contacts?.linkedin || ''}
                    onChange={(e) => {
                      const url = e.target.value;
                      updateCandidateField('socialLinks', { ...candidateData?.socialLinks, linkedin: url });
                      // Also update in resume contacts
                      if (candidateData?.resume) {
                        updateCandidateField('resume', {
                          ...candidateData.resume,
                          contacts: {
                            ...candidateData.resume.contacts,
                            linkedin: url,
                          },
                        });
                      }
                    }}
                    placeholder="https://linkedin.com/in/username"
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    required
                  />
                  <p className="text-xs text-red-600 mt-1">LinkedIn is required</p>
                </div>

                {/* GitHub */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GitHub</label>
                  <input
                    type="text"
                    value={candidateData?.socialLinks?.github || ''}
                    onChange={(e) => updateCandidateField('socialLinks', { ...candidateData?.socialLinks, github: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>

                {/* Portfolio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Portfolio</label>
                  <input
                    type="text"
                    value={candidateData?.socialLinks?.portfolio || ''}
                    onChange={(e) => updateCandidateField('socialLinks', { ...candidateData?.socialLinks, portfolio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>

                {/* Other Social Media */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Other Social Media</label>
                  <input
                    type="text"
                    value={candidateData?.socialLinks?.otherSocialMedia || ''}
                    onChange={(e) => updateCandidateField('socialLinks', { ...candidateData?.socialLinks, otherSocialMedia: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    placeholder="Twitter, Instagram, etc."
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={candidateData?.resume?.contacts?.email || ''}
                    onChange={(e) => {
                      const updatedResume = {
                        ...candidateData?.resume,
                        contacts: {
                          ...candidateData?.resume?.contacts,
                          email: e.target.value,
                        },
                      };
                      updateCandidateField('resume', updatedResume);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={candidateData?.resume?.contacts?.phone || ''}
                    onChange={(e) => {
                      const updatedResume = {
                        ...candidateData?.resume,
                        contacts: {
                          ...candidateData?.resume?.contacts,
                          phone: e.target.value,
                        },
                      };
                      updateCandidateField('resume', updatedResume);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>

                {/* Last Updated Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Last Updated Date</label>
                  <input
                    type="date"
                    value={candidateData?.lastUpdated || ''}
                    onChange={(e) => updateCandidateField('lastUpdated', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                  />
                </div>

                {/* Company Names */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Company Names
                    {candidateData?.companyNames && candidateData.companyNames.length > 0 && (
                      <span className="text-xs text-gray-500 ml-2">({candidateData.companyNames.length} found)</span>
                    )}
                  </label>
                  <textarea
                    value={Array.isArray(candidateData?.companyNames) ? candidateData.companyNames.join(', ') : ''}
                    onChange={(e) => updateCandidateField('companyNames', e.target.value.split(',').map(i => i.trim()).filter(Boolean))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    rows={2}
                    placeholder="Enter company names separated by commas"
                  />
                  {candidateData?.companyNames && candidateData.companyNames.length === 0 && (
                    <p className="text-xs text-yellow-600 mt-1">⚠️ No company names found in resume</p>
                  )}
                </div>

                {/* Summary */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Summary
                    <span className="text-xs text-gray-500 ml-2">(Max 1000 characters)</span>
                  </label>
                  <textarea
                    value={candidateData?.summary || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value.length <= 1000) {
                        updateCandidateField('summary', value);
                      }
                    }}
                    maxLength={1000}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    rows={6}
                    placeholder="AI-generated summary will appear here..."
                  />
                  <div className="flex justify-between items-center mt-1">
                    <p className="text-xs text-gray-500">
                      {candidateData?.summary?.length || 0} / 1000 characters
                    </p>
                    {candidateData?.summary && candidateData.summary.length > 1000 && (
                      <p className="text-xs text-red-600">⚠️ Exceeds 1000 characters</p>
                    )}
                  </div>
                </div>

                {/* Calendly Link */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Calendly Link *
                    <span className="text-xs text-red-600 ml-1">(Required)</span>
                  </label>
                  <input
                    type="url"
                    value={candidateData?.calendly || candidateData?.socialLinks?.calendly || ''}
                    onChange={(e) => {
                      const url = e.target.value;
                      updateCandidateField('calendly', url);
                      updateCandidateField('socialLinks', { ...candidateData?.socialLinks, calendly: url });
                    }}
                    placeholder="https://calendly.com/username"
                    className="w-full px-3 py-2 border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    required
                  />
                  <p className="text-xs text-red-600 mt-1">Calendly link is required for scheduling meetings</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'editing' && (
          <div className="p-4 border-t border-gray-200 flex items-center justify-end gap-3">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Back
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg font-semibold hover:opacity-90 transition-opacity flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              Save Candidate
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

export default AddCandidateModal;

