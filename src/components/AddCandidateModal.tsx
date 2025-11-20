import React, { useState, useRef } from 'react';
import { X, Upload, Loader2, Save, Edit2 } from 'lucide-react';
import { Candidate } from '../types';
import { parseResumeWithAI, convertDocxToText } from '../services/resumeParserService';
import mammoth from 'mammoth';
import { extractContacts, removeContactsFromHtml } from '../utils/resumeParser';

interface AddCandidateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (candidate: Candidate) => void;
}

const AddCandidateModal: React.FC<AddCandidateModalProps> = ({ open, onClose, onSave }) => {
  const [step, setStep] = useState<'upload' | 'editing'>('upload');
  const [isLoading, setIsLoading] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [candidateData, setCandidateData] = useState<Partial<Candidate> | null>(null);
  const [chatGPTResponse, setChatGPTResponse] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      alert('Please upload a .docx file');
      return;
    }

    setResumeFile(file);
    setIsLoading(true);

    try {
      // STEP 1: Convert DOCX to text
      console.log('=== STEP 1: Converting DOCX to text ===');
      const resumeText = await convertDocxToText(file);
      console.log('Resume text extracted. Length:', resumeText.length);
      console.log('Resume text preview:', resumeText.substring(0, 300));
      
      // STEP 2: Parse resume with AI
      console.log('=== STEP 2: Calling ChatGPT API ===');
      const { data: parsedData, rawJson } = await parseResumeWithAI(resumeText);
      
      // STEP 3: Store the raw JSON response for display
      console.log('=== STEP 3: Storing JSON response ===');
      console.log('Raw JSON from ChatGPT:', rawJson);
      setChatGPTResponse(rawJson);
      
      console.log('=== STEP 4: Parsed data received ===');
      console.log('Parsed data:', parsedData);

      // Convert DOCX to HTML for display
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      let htmlContent = result.value;

      // Extract and remove contacts
      const contacts = extractContacts(htmlContent);
      htmlContent = removeContactsFromHtml(htmlContent, contacts);

      console.log('=== STEP 4: Mapping parsed data to candidate format ===');
      
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
      
      console.log('Filtered main industries:', mainIndustries);
      console.log('Filtered related industries:', relatedIndustries);
      console.log('Filtered company names:', companyNames);
      
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
        skills: [],
        whyGreatFit: '',
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
      console.log('=== RESUME PARSING DEBUG ===');
      console.log('Raw parsed data from ChatGPT:', parsedData);
      console.log('Main industries (filtered):', mainIndustries);
      console.log('Related industries (filtered):', relatedIndustries);
      console.log('Company names (filtered):', companyNames);
      console.log('Final candidate data:', newCandidate);
      console.log('Industries array length:', newCandidate.industries?.length);
      console.log('Related industries array length:', newCandidate.relatedIndustries?.length);
      console.log('Company names array length:', newCandidate.companyNames?.length);

      console.log('=== STEP 5: Setting candidate data and opening editing form ===');
      console.log('Full candidate object:', newCandidate);
      console.log('Industries array:', newCandidate.industries);
      console.log('Industries length:', newCandidate.industries?.length);
      console.log('Related industries array:', newCandidate.relatedIndustries);
      console.log('Related industries length:', newCandidate.relatedIndustries?.length);
      console.log('Company names array:', newCandidate.companyNames);
      console.log('Company names length:', newCandidate.companyNames?.length);
      console.log('ChatGPT JSON response stored:', chatGPTResponse ? 'Yes' : 'No');
      
      setCandidateData(newCandidate);
      setStep('editing');
      
      console.log('=== STEP 6: Form opened with pre-filled data ===');
    } catch (error) {
      console.error('Error processing resume:', error);
      alert('Error processing resume. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!candidateData || !resumeFile) return;

    // Ensure location is set
    if (!candidateData.location || candidateData.location.trim() === '') {
      alert('Please enter a location');
      return;
    }

    // LinkedIn is required
    let linkedinUrl = candidateData.socialLinks?.linkedin || candidateData.resume?.contacts?.linkedin;
    if (!linkedinUrl || linkedinUrl.trim() === '' || linkedinUrl === 'Not found') {
      alert('LinkedIn is required. Please enter a valid LinkedIn URL.');
      return;
    }

    // Ensure LinkedIn is properly formatted
    if (!linkedinUrl.startsWith('http')) {
      linkedinUrl = `https://${linkedinUrl}`;
    }

    const newCandidate: Candidate = {
      id: Date.now(), // Temporary ID
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
      whyGreatFit: candidateData.whyGreatFit || '',
      socialLinks: {
        ...candidateData.socialLinks,
        linkedin: linkedinUrl,
      },
      resume: candidateData.resume ? {
        ...candidateData.resume,
        contacts: {
          ...candidateData.resume.contacts,
          linkedin: linkedinUrl,
        },
      } : undefined,
    };

    onSave(newCandidate);
    handleClose();
  };

  const handleClose = () => {
    setStep('upload');
    setResumeFile(null);
    setCandidateData(null);
    setChatGPTResponse('');
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
            {step === 'upload' ? 'Add New Candidate' : 'Edit Candidate Information'}
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
                    Upload a .docx resume file. We'll automatically extract candidate information using AI.
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".docx"
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

                {/* Why Great Fit */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Why Great Fit</label>
                  <textarea
                    value={candidateData?.whyGreatFit || ''}
                    onChange={(e) => updateCandidateField('whyGreatFit', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    rows={4}
                  />
                </div>

                {/* ChatGPT JSON Response */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ChatGPT JSON Response
                    <span className="text-xs text-gray-500 ml-2">(Raw output from AI)</span>
                  </label>
                  <textarea
                    value={chatGPTResponse}
                    readOnly
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-[#7C3AED]"
                    rows={12}
                    placeholder="JSON response from ChatGPT will appear here..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This is the complete JSON response from ChatGPT. All fields above are populated from this data.
                  </p>
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
    </div>
  );
};

export default AddCandidateModal;

