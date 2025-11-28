import React, { useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { generateAllCandidateEmbeddings } from '../utils/generateAllCandidateEmbeddings';

interface GenerateEmbeddingsButtonProps {
  onComplete?: () => void;
}

const GenerateEmbeddingsButton: React.FC<GenerateEmbeddingsButtonProps> = ({ onComplete }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<string>('');

  const handleGenerate = async () => {
    if (!confirm('This will generate embeddings for ALL candidates in the database. This may take a while and use OpenAI API credits. Continue?')) {
      return;
    }

    setIsGenerating(true);
    setProgress('Starting embedding generation...');

    try {
      await generateAllCandidateEmbeddings();
      setProgress('✅ All embeddings generated successfully!');
      alert('Embeddings generated successfully for all candidates!');
      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      console.error('Error generating embeddings:', error);
      setProgress('❌ Error generating embeddings. Check console for details.');
      alert('Error generating embeddings. Check console for details.');
    } finally {
      setIsGenerating(false);
      setTimeout(() => setProgress(''), 5000);
    }
  };

  return (
    <div className="mb-4">
      <button
        onClick={handleGenerate}
        disabled={isGenerating}
        className="px-4 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Generating...
          </>
        ) : (
          <>
            <Sparkles className="w-5 h-5" />
            Generate Embeddings for All Candidates
          </>
        )}
      </button>
      {progress && (
        <p className="mt-2 text-sm text-gray-600">{progress}</p>
      )}
    </div>
  );
};

export default GenerateEmbeddingsButton;


