import React from 'react';
import { X, Mail, Phone, Calendar, Globe, Linkedin, Github, ExternalLink } from 'lucide-react';
import { Candidate } from '../types';

interface ContactModalProps {
  open: boolean;
  onClose: () => void;
  candidate: Candidate;
}

const ContactModal: React.FC<ContactModalProps> = ({ open, onClose, candidate }) => {
  if (!open) return null;

  const contacts = candidate.resume?.contacts;
  const email = contacts?.email;
  const phone = contacts?.phone;
  const calendlyUrl = candidate.calendly || candidate.socialLinks?.calendly;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] p-4 rounded-t-xl flex items-center justify-between">
          <h2 className="text-white font-semibold text-lg">Get in Touch</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="text-center mb-4">
            <h3 className="text-xl font-bold text-gray-800">{candidate.name}</h3>
            <p className="text-sm text-gray-600">{candidate.jobTitle}</p>
          </div>

          {/* Calendly Link - Prominent */}
          {calendlyUrl && (
            <a
              href={calendlyUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg hover:opacity-90 transition-opacity font-semibold"
            >
              <Calendar className="w-5 h-5" />
              <span>Schedule a Meeting</span>
              <ExternalLink className="w-4 h-4 ml-auto" />
            </a>
          )}

          {/* Contact Information */}
          <div className="space-y-3 pt-2">
            {email && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Mail className="w-5 h-5 text-[#7C3AED]" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Email</p>
                  <a
                    href={`mailto:${email}`}
                    className="text-sm font-medium text-gray-800 hover:text-[#7C3AED] transition-colors"
                  >
                    {email}
                  </a>
                </div>
              </div>
            )}

            {phone && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <Phone className="w-5 h-5 text-[#7C3AED]" />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">Phone</p>
                  <a
                    href={`tel:${phone}`}
                    className="text-sm font-medium text-gray-800 hover:text-[#7C3AED] transition-colors"
                  >
                    {phone}
                  </a>
                </div>
              </div>
            )}

            {/* Social Links */}
            <div className="flex items-center gap-2 pt-2">
              {candidate.socialLinks?.linkedin && (
                <a
                  href={candidate.socialLinks.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                  <span className="text-xs font-medium">LinkedIn</span>
                </a>
              )}
              {candidate.socialLinks?.github && (
                <a
                  href={candidate.socialLinks.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <Github className="w-4 h-4" />
                  <span className="text-xs font-medium">GitHub</span>
                </a>
              )}
              {candidate.socialLinks?.portfolio && (
                <a
                  href={candidate.socialLinks.portfolio}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-medium">Portfolio</span>
                </a>
              )}
              {candidate.socialLinks?.otherSocialMedia && (
                <a
                  href={candidate.socialLinks.otherSocialMedia}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 bg-cyan-50 text-cyan-600 rounded-lg hover:bg-cyan-100 transition-colors"
                >
                  <Globe className="w-4 h-4" />
                  <span className="text-xs font-medium">Social</span>
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactModal;

