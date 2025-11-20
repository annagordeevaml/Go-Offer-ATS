import React, { useEffect, useRef } from 'react';
import { X, Download } from 'lucide-react';
import mammoth from 'mammoth';

interface ResumeViewerProps {
  resumeFile: File;
  htmlContent: string;
  onClose: () => void;
}

const ResumeViewer: React.FC<ResumeViewerProps> = ({ resumeFile, htmlContent, onClose }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const url = URL.createObjectURL(resumeFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = resumeFile.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] p-4 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-white font-semibold text-lg">Resume: {resumeFile.name}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-white/20 border border-white/30 text-white text-sm rounded-lg hover:bg-white/30 transition-all duration-200 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Resume Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
          <div
            ref={containerRef}
            className="bg-white rounded-lg shadow-sm p-8 max-w-4xl mx-auto prose prose-sm sm:prose lg:prose-lg xl:prose-xl"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />
        </div>
      </div>
    </div>
  );
};

export default ResumeViewer;

