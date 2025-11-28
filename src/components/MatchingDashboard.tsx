import React, { useState, useEffect } from 'react';
import { Search, Loader2, ChevronDown, ChevronUp, ExternalLink, X } from 'lucide-react';
import { fetchVacancies, findMatches, CandidateMatchResult, Vacancy, fetchCandidateDetails, CandidateMatchDetails } from '../services/matchingApi';
import Header from './Header';

type SortField = 'pre_score' | 'neural_rank_score' | 'llm_score' | 'final_score';
type SortDirection = 'asc' | 'desc';

interface CandidateWithDetails extends CandidateMatchResult {
  full_name?: string;
  general_title?: string;
  location?: string;
}

const MatchingDashboard: React.FC<MatchingDashboardProps> = ({ onNavigate }) => {
  const [vacancies, setVacancies] = useState<Vacancy[]>([]);
  const [selectedVacancyId, setSelectedVacancyId] = useState<string>('');
  const [matches, setMatches] = useState<CandidateWithDetails[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingVacancies, setLoadingVacancies] = useState<boolean>(true);
  const [sortField, setSortField] = useState<SortField>('final_score');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateMatchDetails | null>(null);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  // Fetch vacancies on mount
  useEffect(() => {
    loadVacancies();
  }, []);

  const loadVacancies = async () => {
    try {
      setLoadingVacancies(true);
      const data = await fetchVacancies();
      setVacancies(data);
    } catch (error) {
      console.error('Error loading vacancies:', error);
    } finally {
      setLoadingVacancies(false);
    }
  };

  const handleFindMatches = async () => {
    if (!selectedVacancyId) {
      alert('Please select a vacancy first');
      return;
    }

    try {
      setLoading(true);
      const results = await findMatches(selectedVacancyId);
      
      // Fetch candidate details for each match
      const candidatesWithDetails: CandidateWithDetails[] = await Promise.all(
        results.map(async (match) => {
          const details = await fetchCandidateDetails(match.candidate_id);
          return {
            ...match,
            full_name: details?.full_name || 'Unknown',
            general_title: details?.general_title || 'N/A',
            location: details?.location || 'N/A',
          };
        })
      );

      setMatches(candidatesWithDetails);
    } catch (error) {
      console.error('Error finding matches:', error);
      alert('Failed to find matches. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sortedMatches = [...matches].sort((a, b) => {
    const aValue = a[sortField];
    const bValue = b[sortField];
    const multiplier = sortDirection === 'asc' ? 1 : -1;
    return (aValue - bValue) * multiplier;
  });

  const toggleRowExpansion = (candidateId: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(candidateId)) {
      newExpanded.delete(candidateId);
    } else {
      newExpanded.add(candidateId);
    }
    setExpandedRows(newExpanded);
  };

  const handleOpenResume = async (candidateId: string) => {
    try {
      const details = await fetchCandidateDetails(candidateId);
      if (details) {
        // Merge with match scores
        const match = matches.find(m => m.candidate_id === candidateId);
        setSelectedCandidate({
          ...details,
          pre_score: match?.pre_score || 0,
          neural_rank_score: match?.neural_rank_score || 0,
          llm_score: match?.llm_score || 0,
          final_score: match?.final_score || 0,
          explanation: match?.explanation || '',
        });
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('Error opening resume:', error);
      alert('Failed to load resume details');
    }
  };

  const getScoreColor = (score: number): string => {
    if (score > 0.75) return 'text-green-600 bg-green-50';
    if (score >= 0.5) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreBadgeColor = (score: number): string => {
    if (score > 0.75) return 'bg-green-500';
    if (score >= 0.5) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#E8E9EB] via-[#E0E2E5] to-[#E8E9EB]">
      <Header activePage="Match" />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">Matching Dashboard</h1>
          
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Vacancy
              </label>
              <select
                value={selectedVacancyId}
                onChange={(e) => setSelectedVacancyId(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#7C3AED] focus:border-transparent"
                disabled={loadingVacancies}
              >
                <option value="">-- Select a vacancy --</option>
                {vacancies.map((vacancy) => (
                  <option key={vacancy.id} value={vacancy.id}>
                    {vacancy.title} - {vacancy.location || 'N/A'}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleFindMatches}
              disabled={!selectedVacancyId || loading}
              className="px-6 py-2 bg-gradient-to-r from-[#7C3AED] to-[#06B6D4] text-white rounded-lg font-semibold hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Finding Matches...
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Find Matches
                </>
              )}
            </button>
          </div>
        </div>

        {matches.length > 0 && (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Title
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('pre_score')}
                    >
                      <div className="flex items-center gap-1">
                        Pre Score
                        <SortIcon field="pre_score" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('neural_rank_score')}
                    >
                      <div className="flex items-center gap-1">
                        Neural Rank
                        <SortIcon field="neural_rank_score" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('llm_score')}
                    >
                      <div className="flex items-center gap-1">
                        LLM Score
                        <SortIcon field="llm_score" />
                      </div>
                    </th>
                    <th 
                      className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                      onClick={() => handleSort('final_score')}
                    >
                      <div className="flex items-center gap-1">
                        Final Score
                        <SortIcon field="final_score" />
                      </div>
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Explanation
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sortedMatches.map((match) => (
                    <React.Fragment key={match.candidate_id}>
                      <tr className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {match.full_name || 'Unknown'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {match.location || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">
                            {match.general_title || 'N/A'}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreColor(match.pre_score)}`}>
                            {(match.pre_score * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreColor(match.neural_rank_score)}`}>
                            {(match.neural_rank_score * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded text-sm font-medium ${getScoreColor(match.llm_score)}`}>
                            {(match.llm_score * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-sm font-bold text-white ${getScoreBadgeColor(match.final_score)}`}>
                            {(match.final_score * 100).toFixed(1)}%
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            onClick={() => toggleRowExpansion(match.candidate_id)}
                            className="text-sm text-[#7C3AED] hover:underline flex items-center gap-1"
                          >
                            {expandedRows.has(match.candidate_id) ? 'Hide' : 'Show'} Explanation
                            {expandedRows.has(match.candidate_id) ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenResume(match.candidate_id)}
                            className="px-3 py-1 bg-[#7C3AED] text-white rounded text-sm font-medium hover:bg-[#6D28D9] flex items-center gap-1"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Open Resume
                          </button>
                        </td>
                      </tr>
                      {expandedRows.has(match.candidate_id) && (
                        <tr>
                          <td colSpan={8} className="px-6 py-4 bg-gray-50">
                            <div className="text-sm text-gray-700">
                              <strong>Explanation:</strong> {match.explanation}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {matches.length === 0 && !loading && selectedVacancyId && (
          <div className="bg-white rounded-lg shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg">No matches found. Click "Find Matches" to search for candidates.</p>
          </div>
        )}
        </div>
      </div>

      {/* Resume Modal */}
      {isModalOpen && selectedCandidate && (
        <CandidateResumeModal
          candidate={selectedCandidate}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedCandidate(null);
          }}
        />
      )}
    </div>
  );
};

interface CandidateResumeModalProps {
  candidate: CandidateMatchDetails;
  onClose: () => void;
}

const CandidateResumeModal: React.FC<CandidateResumeModalProps> = ({ candidate, onClose }) => {
  const [activeTab, setActiveTab] = useState<'resume' | 'explanation'>('resume');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{candidate.full_name}</h2>
            <p className="text-sm text-gray-500">{candidate.general_title} • {candidate.location}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-200 flex gap-4">
          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-1">Final Score</div>
            <div className={`inline-block px-3 py-1 rounded-full text-lg font-bold text-white ${
              candidate.final_score > 0.75 ? 'bg-green-500' :
              candidate.final_score >= 0.5 ? 'bg-yellow-500' : 'bg-red-500'
            }`}>
              {(candidate.final_score * 100).toFixed(1)}%
            </div>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-1">Pre Score</div>
            <div className="text-lg font-semibold text-gray-900">{(candidate.pre_score * 100).toFixed(1)}%</div>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-1">Neural Rank</div>
            <div className="text-lg font-semibold text-gray-900">{(candidate.neural_rank_score * 100).toFixed(1)}%</div>
          </div>
          <div className="flex-1">
            <div className="text-sm text-gray-500 mb-1">LLM Score</div>
            <div className="text-lg font-semibold text-gray-900">{(candidate.llm_score * 100).toFixed(1)}%</div>
          </div>
        </div>

        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('resume')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'resume'
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Resume
            </button>
            <button
              onClick={() => setActiveTab('explanation')}
              className={`px-4 py-2 rounded-lg font-medium ${
                activeTab === 'explanation'
                  ? 'bg-[#7C3AED] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Explanation
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'resume' && (
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans">
                {candidate.resume_text || 'No resume text available'}
              </pre>
            </div>
          )}

          {activeTab === 'explanation' && (
            <div className="text-gray-700">
              <h3 className="text-lg font-semibold mb-3">Match Explanation</h3>
              <p className="text-base leading-relaxed">{candidate.explanation}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MatchingDashboard;

