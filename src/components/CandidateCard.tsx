import React, { useState, useRef, useEffect } from 'react';
import {
  MapPin,
  Clock,
  Calendar,
  Check,
  Plus,
  Phone,
  Linkedin,
  Github,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Globe,
  FileText,
  Target,
  User,
  Sparkles,
  Upload,
  Eye,
  Briefcase,
  Edit2,
  DollarSign,
  Trash2,
  Code,
  X,
} from 'lucide-react';
import { Candidate } from '../types';
import { Tabs, TabsList, TabsTrigger, TabsContent } from './Tabs';
import ResumeViewer from './ResumeViewer';
import ContactModal from './ContactModal';
import mammoth from 'mammoth';
import { extractContacts, removeContactsFromHtml } from '../utils/resumeParser';

interface CandidateCardProps {
  candidate: Candidate;
  jobHardSkills?: string[]; // Hard skills from the job for skills matching display
  onResumeUpload?: (candidateId: number, resume: { file: File; htmlContent: string; contacts?: { email: string | null; phone: string | null; linkedin: string | null } }) => void;
  onCandidateUpdate?: (candidateId: number, updates: Partial<Candidate>) => void;
  onEdit?: (candidate: Candidate) => void;
  onDelete?: (candidateId: number) => void;
}

const CandidateCard: React.FC<CandidateCardProps> = ({ candidate, jobHardSkills, onResumeUpload, onCandidateUpdate, onEdit, onDelete }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isRelocationOpen, setIsRelocationOpen] = useState(false);
  const [resume, setResume] = useState<{ file: File | null; htmlContent: string; contacts?: { email: string | null; phone: string | null; linkedin: string | null } } | null>(
    candidate.resume || null
  );
  
  // Update resume when candidate prop changes
  useEffect(() => {
    if (candidate.resume) {
      setResume(candidate.resume);
    }
  }, [candidate.resume]);
  const [isResumeViewerOpen, setIsResumeViewerOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isRelatedIndustriesOpen, setIsRelatedIndustriesOpen] = useState(false);
  const [isSkillsModalOpen, setIsSkillsModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const relocationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (relocationRef.current && !relocationRef.current.contains(event.target as Node)) {
        setIsRelocationOpen(false);
      }
    };

    if (isRelocationOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isRelocationOpen]);


  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsContactModalOpen(true);
  };

  const handleAddToPipeline = (e: React.MouseEvent) => {
    e.stopPropagation();
    const jobTitle = prompt('Select job to add candidate to:');
    if (jobTitle) {
      alert(`✅ ${candidate.name} added to pipeline for "${jobTitle}"`);
    }
  };

  const displayedIndustries = candidate.industries.slice(0, 5);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const isDocx = file.name.endsWith('.docx');
    const isPdf = file.name.endsWith('.pdf');

    if (!isDocx && !isPdf) {
      alert('Please upload a .docx or .pdf file');
      return;
    }

    try {
      let htmlContent: string;
      let contacts: { email: string | null; phone: string | null; linkedin: string | null };

      if (isDocx) {
        // Convert DOCX to HTML
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer });
        htmlContent = result.value;

        // Extract contacts from resume
        contacts = extractContacts(htmlContent);
        
        // Remove contacts from HTML content
        htmlContent = removeContactsFromHtml(htmlContent, contacts);
      } else if (isPdf) {
        // Convert PDF to text first
        const { convertPdfToText } = await import('../services/resumeParserService');
        const pdfText = await convertPdfToText(file);
        
        // Create simple HTML from PDF text
        htmlContent = `<div style="white-space: pre-wrap; font-family: Arial, sans-serif; line-height: 1.6; padding: 20px;">${pdfText.replace(/\n/g, '<br>')}</div>`;
        
        // Extract contacts from PDF text (basic extraction)
        contacts = extractContacts(htmlContent);
      } else {
        throw new Error('Unsupported file type');
      }

      const resumeData = { file, htmlContent, contacts };
      setResume(resumeData);

      // Update candidate's LinkedIn link if found
      if (contacts.linkedin && onCandidateUpdate) {
        onCandidateUpdate(candidate.id, {
          socialLinks: {
            ...candidate.socialLinks,
            linkedin: contacts.linkedin,
          },
        });
      }

      if (onResumeUpload) {
        onResumeUpload(candidate.id, resumeData);
      }
    } catch (error) {
      console.error('Error parsing resume:', error);
      alert('Error parsing resume file. Please try again.');
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't expand if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest('button') ||
      target.closest('a') ||
      target.closest('input') ||
      target.closest('.resume-upload-trigger') ||
      target.closest('.resume-preview')
    ) {
      return;
    }
    
    // Toggle card expansion
    setIsExpanded(!isExpanded);
  };

  const handleResumeClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (resume && resume.file) {
      setIsResumeViewerOpen(true);
    }
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".docx,.pdf"
        onChange={handleFileUpload}
        className="hidden"
      />
      <div 
        className="bg-white border border-gray-200 rounded-xl transition-all duration-300 hover:border-[#7C3AED] hover:shadow-lg hover:shadow-purple-500/20 cursor-pointer"
        onClick={handleCardClick}
      >
      {/* Card Header */}
      <div className="bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] p-4 px-5 rounded-t-xl relative">
        {/* Score Badges - Top Right Corner */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
          {/* Title Score Badge */}
          {(typeof candidate.titleScore === 'number') && (
            <div className="bg-white/95 backdrop-blur-sm border-2 border-white rounded-lg px-3 py-1.5 shadow-lg">
              <div className="flex items-center gap-1.5">
                <Target className="w-4 h-4 text-[#7C3AED]" />
                <span className="text-sm font-bold text-gray-900">
                  Title: {candidate.titleScore.toFixed(0)}
                </span>
              </div>
            </div>
          )}
          {/* Industries Score Badge */}
          {(typeof candidate.industriesScore === 'number') && (
            <div className="bg-white/95 backdrop-blur-sm border-2 border-white rounded-lg px-3 py-1.5 shadow-lg">
              <div className="flex items-center gap-1.5">
                <Briefcase className="w-4 h-4 text-[#10B981]" />
                <span className="text-sm font-bold text-gray-900">
                  Industries: {candidate.industriesScore.toFixed(0)}
                </span>
              </div>
            </div>
          )}
          {/* Location Score Badge */}
          {(typeof candidate.locationScore === 'number') && (
            <div className="bg-white/95 backdrop-blur-sm border-2 border-white rounded-lg px-3 py-1.5 shadow-lg">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-[#06B6D4]" />
                <span className="text-sm font-bold text-gray-900">
                  Location: {candidate.locationScore.toFixed(0)}
                </span>
              </div>
            </div>
          )}
          {/* Skills Score Badge */}
          {(typeof candidate.skillsScore === 'number') && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsSkillsModalOpen(true);
              }}
              className="bg-white/95 backdrop-blur-sm border-2 border-white rounded-lg px-3 py-1.5 shadow-lg hover:bg-white transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Code className="w-4 h-4 text-[#F59E0B]" />
                <span className="text-sm font-bold text-gray-900">
                  Skills: {candidate.skillsScore.toFixed(0)}%
                </span>
              </div>
            </button>
          )}
        </div>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-0.5">
              <h3 className="text-lg font-bold text-white">{candidate.name}</h3>
              {/* Social Links - attached to name */}
              <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                {(candidate.socialLinks.linkedin || candidate.resume?.contacts?.linkedin || resume?.contacts?.linkedin) && (
                  <a
                    href={candidate.socialLinks.linkedin || candidate.resume?.contacts?.linkedin || resume?.contacts?.linkedin || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
                    aria-label="LinkedIn profile"
                  >
                    <Linkedin className="w-3.5 h-3.5 text-white fill-white" />
                  </a>
                )}
                {candidate.socialLinks.github && (
                  <a
                    href={candidate.socialLinks.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
                    aria-label="GitHub profile"
                  >
                    <Github className="w-3 h-3 text-white" />
                  </a>
                )}
                {candidate.socialLinks.portfolio && (
                  <a
                    href={candidate.socialLinks.portfolio}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors duration-200"
                    aria-label="Portfolio"
                  >
                    <ExternalLink className="w-3 h-3 text-white" />
                  </a>
                )}
              </div>
            </div>
            <div className="mb-2">
              <p className="text-sm text-white/90 font-semibold">
                {candidate.jobTitle}
                {candidate.unifiedTitles && candidate.unifiedTitles.length > 0 && (
                  <span className="text-xs text-white/70 font-normal ml-1">
                    | {candidate.unifiedTitles.join(', ')}
                  </span>
                )}
              </p>
            </div>
            {/* Main Industries - under name, smaller size, max 5 */}
            {displayedIndustries.length > 0 && (
              <div className="flex flex-wrap gap-1 items-start mb-1">
                {displayedIndustries.map((industry, idx) => (
                  <span
                    key={idx}
                    className="bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded px-1.5 py-0.5 text-[10px] font-medium"
                  >
                    {industry}
                  </span>
                ))}
              </div>
            )}
            {/* Related Industries - Clickable */}
            {candidate.relatedIndustries && candidate.relatedIndustries.length > 0 && (
              <div className="flex flex-wrap gap-1 items-start mb-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsRelatedIndustriesOpen(!isRelatedIndustriesOpen);
                  }}
                  className="text-[9px] text-white/70 mr-1 hover:text-white transition-colors flex items-center gap-1"
                >
                  Related:
                  <ChevronDown className={`w-2.5 h-2.5 transition-transform ${isRelatedIndustriesOpen ? 'rotate-180' : ''}`} />
                </button>
                {isRelatedIndustriesOpen ? (
                  <div className="flex flex-wrap gap-1">
                    {candidate.relatedIndustries.map((industry, idx) => (
                      <span
                        key={idx}
                        className="bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded px-1.5 py-0.5 text-[9px] font-medium"
                      >
                        {industry}
                      </span>
                    ))}
                  </div>
                ) : (
                  <>
                    {candidate.relatedIndustries.slice(0, 3).map((industry, idx) => (
                      <span
                        key={idx}
                        className="bg-white/15 backdrop-blur-sm border border-white/20 text-white rounded px-1.5 py-0.5 text-[9px] font-medium"
                      >
                        {industry}
                      </span>
                    ))}
                    {candidate.relatedIndustries.length > 3 && (
                      <span className="text-[9px] text-white/60">+{candidate.relatedIndustries.length - 3}</span>
                    )}
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex flex-col items-end gap-2">
            {/* Location Score - on colored background, above salary */}
            {candidate.locationScore !== undefined && (
              <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-white" />
                  <span className="text-sm text-white font-semibold">
                    Location Match: {Math.round(candidate.locationScore * 100)}%
                  </span>
                </div>
              </div>
            )}
            {/* Salary Range - on colored background, below location score */}
            {(candidate.salaryMin || candidate.salaryMax) && (
              <div className="bg-white/20 backdrop-blur-sm border border-white/30 rounded-lg px-3 py-2 mb-2">
                <div className="flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-white" />
                  <span className="text-sm text-white font-semibold">
                    {(() => {
                      const formatSalary = (value: string) => {
                        const num = parseFloat(value);
                        if (isNaN(num)) return value;
                        return new Intl.NumberFormat('en-US', { 
                          style: 'currency', 
                          currency: 'USD',
                          maximumFractionDigits: 0 
                        }).format(num);
                      };
                      const unit = candidate.salaryUnit || 'year';
                      const unitLabel = unit === 'year' ? '/year' : unit === 'month' ? '/month' : '/hour';
                      if (candidate.salaryMin && candidate.salaryMax) {
                        return `${formatSalary(candidate.salaryMin)} - ${formatSalary(candidate.salaryMax)} ${unitLabel}`;
                      } else if (candidate.salaryMin) {
                        return `${formatSalary(candidate.salaryMin)}+ ${unitLabel}`;
                      } else {
                        return `Up to ${formatSalary(candidate.salaryMax)} ${unitLabel}`;
                      }
                    })()}
                  </span>
                </div>
              </div>
            )}
            {/* Top row: Edit and Delete buttons */}
            <div className="flex items-center gap-2">
              {/* Edit Button */}
              {onEdit && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(candidate);
                  }}
                  className="w-7 h-7 rounded-full bg-white/20 border border-white/30 flex items-center justify-center hover:bg-white/30 transition-all duration-200 text-white focus:outline-none focus:ring-2 focus:ring-white"
                  aria-label="Edit candidate"
                  title="Edit candidate"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {/* Delete Button */}
              {onDelete && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Are you sure you want to delete ${candidate.name}? This action cannot be undone.`)) {
                      onDelete(candidate.id);
                    }
                  }}
                  className="w-7 h-7 rounded-full bg-red-500/80 border border-red-400/50 flex items-center justify-center hover:bg-red-600/90 transition-all duration-200 text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                  aria-label="Delete candidate"
                  title="Delete candidate"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            {/* Buttons - second row */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleContact}
                className="flex items-center gap-1.5 px-3 py-1 bg-white/20 border border-white/30 text-white text-xs rounded-md hover:bg-white/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <Phone className="w-3 h-3" />
                Get in touch
              </button>
              <button
                onClick={handleAddToPipeline}
                className="flex items-center gap-1.5 px-3 py-1 bg-white/20 border border-white/30 text-white rounded-md text-xs hover:bg-white/30 hover:scale-105 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white"
              >
                <Plus className="w-3 h-3" />
                Add to Pipeline
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-4 bg-white relative">
        {/* Expand/Collapse Button - bottom right */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
          className="absolute bottom-4 right-4 w-7 h-7 rounded-full bg-purple-100 border border-purple-300 flex items-center justify-center hover:bg-purple-200 transition-colors duration-200 text-purple-700 z-10"
          aria-label={isExpanded ? 'Collapse' : 'Expand'}
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {/* Meta Row - Compact */}
        <div className="flex flex-wrap gap-4 text-xs text-gray-600 mb-2">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-gray-500" />
            <span>{candidate.location}</span>
          </div>
          {candidate.readyToRelocateTo && candidate.readyToRelocateTo.length > 0 && (
            <div className="relative" ref={relocationRef}>
              <button
                onClick={() => setIsRelocationOpen(!isRelocationOpen)}
                className="flex items-center gap-1.5 hover:text-[#7C3AED] transition-colors"
              >
                <Globe className="w-3.5 h-3.5 text-gray-500" />
                <span className="font-medium">
                  Ready to relocate to: <span className="text-[#7C3AED]">{candidate.readyToRelocateTo.length} states</span>
                </span>
                <ChevronDown className={`w-3 h-3 transition-transform ${isRelocationOpen ? 'rotate-180' : ''}`} />
              </button>
              {isRelocationOpen && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto w-64">
                  <div className="p-3">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Available states:</p>
                    <div className="grid grid-cols-2 gap-1">
                      {candidate.readyToRelocateTo.map((state, idx) => (
                        <span key={idx} className="text-xs text-gray-600 px-2 py-1 bg-gray-50 rounded">
                          {state}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-gray-500" />
              <span>{candidate.experience} in total</span>
            </div>
            {(candidate.salaryMin || candidate.salaryMax) && (
              <div className="flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-gray-500" />
                <span className="font-medium text-gray-700">
                  {(() => {
                    const formatSalary = (value: string) => {
                      const num = parseFloat(value);
                      if (isNaN(num)) return value;
                      return new Intl.NumberFormat('en-US', { 
                        style: 'currency', 
                        currency: 'USD',
                        maximumFractionDigits: 0 
                      }).format(num);
                    };
                    const unit = candidate.salaryUnit || 'year';
                    const unitLabel = unit === 'year' ? '/year' : unit === 'month' ? '/month' : '/hour';
                    if (candidate.salaryMin && candidate.salaryMax) {
                      return `${formatSalary(candidate.salaryMin)} - ${formatSalary(candidate.salaryMax)} ${unitLabel}`;
                    } else if (candidate.salaryMin) {
                      return `${formatSalary(candidate.salaryMin)}+ ${unitLabel}`;
                    } else {
                      return `Up to ${formatSalary(candidate.salaryMax)} ${unitLabel}`;
                    }
                  })()}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
              <span className="text-gray-500">Last updated: <span className="font-medium text-gray-700">{candidate.lastUpdated}</span></span>
            </div>
          </div>
          
          {/* Company Names - Second Row */}
          {candidate.companyNames && candidate.companyNames.length > 0 && (
            <div className="w-full flex items-start gap-1.5 text-xs text-gray-600 mt-1 mb-4">
              <Briefcase className="w-3.5 h-3.5 text-gray-500 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium">Companies: </span>
                <span className="text-gray-700">{candidate.companyNames.join(', ')}</span>
              </div>
            </div>
          )}

        {/* Summary - Beautiful Design */}
        <div className="mb-3 mt-2 bg-white border-2 border-[#7C3AED]/20 rounded-lg p-5 shadow-md">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Sparkles className="w-5 h-5 text-[#7C3AED]" />
            </div>
            <div className="flex-1">
              <p className="text-base text-gray-900 leading-7 font-normal whitespace-pre-wrap">{candidate.summary}</p>
            </div>
          </div>
        </div>

        {/* Collapsible Content */}
        {isExpanded && (
          <div className="space-y-3 pt-3 border-t border-gray-100">
            {/* Skills Tags */}
            <div>
              <p className="text-xs uppercase text-gray-500 mb-1.5 font-semibold">SKILLS</p>
              <div className="flex flex-wrap gap-1.5">
                {(candidate.hardSkills && candidate.hardSkills.length > 0 ? candidate.hardSkills : candidate.skills || []).map((skill, index) => (
                  <span
                    key={index}
                    className="bg-purple-50 border border-purple-200 text-purple-700 rounded px-2 py-1 text-xs"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Tabs Section */}
            <Tabs defaultValue="resume">
              <TabsList>
                <TabsTrigger value="resume">
                  <FileText className="w-3.5 h-3.5 mr-1.5" />
                  Resume
                </TabsTrigger>
                <TabsTrigger value="match">
                  <Target className="w-3.5 h-3.5 mr-1.5" />
                  Match with Job
                </TabsTrigger>
                <TabsTrigger value="about">
                  <User className="w-3.5 h-3.5 mr-1.5" />
                  About Candidate
                </TabsTrigger>
              </TabsList>

              <TabsContent value="resume">
                {resume && resume.htmlContent ? (
                  <div className="space-y-3">
                    {resume.file && (
                      <div className="flex items-center justify-end mb-3">
                        <button
                          onClick={handleResumeClick}
                          className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 border border-purple-300 text-[#7C3AED] rounded-lg text-xs hover:bg-purple-100 transition-all duration-200"
                        >
                          <Eye className="w-4 h-4" />
                          View Full Resume
                        </button>
                      </div>
                    )}
                    {/* Resume Preview */}
                    <div className="border border-gray-200 rounded-lg bg-white max-h-96 overflow-y-auto p-4">
                      <div
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: resume.htmlContent }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-600">
                    <FileText className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                    <p className="text-sm font-medium mb-3">No resume uploaded</p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".docx,.pdf"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        fileInputRef.current?.click();
                      }}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg text-sm hover:opacity-90 transition-opacity mx-auto resume-upload-trigger"
                    >
                      <Upload className="w-4 h-4" />
                      Upload Resume (.docx or .pdf)
                    </button>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="match">
                <div className="text-center py-6 text-gray-600">
                  <Target className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Detailed match analysis</p>
                  <p className="text-xs text-gray-500 mt-1">Skills match, experience alignment, and fit score breakdown</p>
                </div>
              </TabsContent>

              <TabsContent value="about">
                <div className="text-center py-6 text-gray-600">
                  <User className="w-12 h-12 mx-auto mb-2 text-gray-400" />
                  <p className="text-sm font-medium">Candidate background and details</p>
                  <p className="text-xs text-gray-500 mt-1">Education, certifications, and additional information</p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
      {/* Resume Viewer Popup */}
      {isResumeViewerOpen && resume && resume.file && (
        <ResumeViewer
          resumeFile={resume.file}
          htmlContent={resume.htmlContent}
          onClose={() => setIsResumeViewerOpen(false)}
        />
      )}
      
      {/* Contact Modal */}
      <ContactModal
        open={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        candidate={candidate}
      />

      {/* Skills Match Modal */}
      {isSkillsModalOpen && jobHardSkills && jobHardSkills.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsSkillsModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Code className="w-6 h-6 text-[#F59E0B]" />
                    Skills Match
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {candidate.name} - {candidate.skillsScore?.toFixed(0)}% match
                  </p>
                </div>
                <button
                  onClick={() => setIsSkillsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="mb-4">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Required Skills ({jobHardSkills.length}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {jobHardSkills.map((skill, index) => {
                    const candidateSkills = candidate.hardSkills || [];
                    const normalizedCandidateSkills = candidateSkills.map(s => s.toLowerCase().trim());
                    const hasSkill = normalizedCandidateSkills.includes(skill.toLowerCase().trim());
                    
                    return (
                      <span
                        key={index}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          hasSkill
                            ? 'bg-green-100 text-green-800 border-2 border-green-300 shadow-sm'
                            : 'bg-gray-100 text-gray-600 border-2 border-gray-200 opacity-60'
                        }`}
                      >
                        {hasSkill && (
                          <Check className="w-3 h-3 inline mr-1.5 text-green-600" />
                        )}
                        {skill}
                      </span>
                    );
                  })}
                </div>
              </div>
              
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  Candidate Skills ({candidate.hardSkills?.length || 0}):
                </p>
                <div className="flex flex-wrap gap-2">
                  {(candidate.hardSkills || []).map((skill, index) => (
                    <span
                      key={index}
                      className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-50 text-blue-800 border-2 border-blue-200"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
  );
};

export default CandidateCard;
