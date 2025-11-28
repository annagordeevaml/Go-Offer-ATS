import { useState, useEffect } from 'react';
import { 
  runBenchmark, 
  getBenchmarkResults, 
  getAllBenchmarkJobs,
  getBenchmarkResultsByVersion,
  type BenchmarkMetrics 
} from '../services/benchmarkService';
import { supabase } from '../lib/supabaseClient';
import { Play, TrendingUp, BarChart3, Target, Clock } from 'lucide-react';

interface BenchmarkResult {
  id: number;
  job_id: string;
  version: string;
  precision_5: number;
  precision_10: number;
  recall_5: number;
  recall_10: number;
  ndcg_5: number;
  ndcg_10: number;
  mrr: number;
  timestamp: string;
  total_relevant_candidates: number;
  total_retrieved_candidates: number;
}

interface BenchmarkJob {
  id: number;
  job_id: string;
  ground_truth_candidates: string[];
  created_at: string;
  vacancies?: {
    title: string;
    location: string;
    industry: string;
  };
}

export default function BenchmarkDashboard() {
  const [benchmarkJobs, setBenchmarkJobs] = useState<BenchmarkJob[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [selectedVersion, setSelectedVersion] = useState<string>('v1');
  const [results, setResults] = useState<BenchmarkResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<string[]>(['v1']);

  // Load benchmark jobs on mount
  useEffect(() => {
    loadBenchmarkJobs();
    loadVersions();
  }, []);

  // Load results when job or version changes
  useEffect(() => {
    if (selectedJobId) {
      loadResults();
    }
  }, [selectedJobId, selectedVersion]);

  async function loadBenchmarkJobs() {
    try {
      const jobs = await getAllBenchmarkJobs();
      setBenchmarkJobs(jobs as any);
      if (jobs.length > 0 && !selectedJobId) {
        setSelectedJobId(jobs[0].job_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load benchmark jobs');
    }
  }

  async function loadVersions() {
    try {
      const { data, error } = await supabase
        .from('matching_benchmark_results')
        .select('version')
        .order('timestamp', { ascending: false });

      if (error) throw error;

      const uniqueVersions = Array.from(new Set(data.map((r: any) => r.version))).sort();
      setVersions(uniqueVersions.length > 0 ? uniqueVersions : ['v1']);
    } catch (err) {
      console.error('Failed to load versions:', err);
    }
  }

  async function loadResults() {
    if (!selectedJobId) return;

    try {
      setLoading(true);
      setError(null);

      if (selectedVersion === 'all') {
        const allResults = await getBenchmarkResults(selectedJobId);
        setResults(allResults as any);
      } else {
        const versionResults = await getBenchmarkResultsByVersion(selectedVersion);
        const filtered = versionResults.filter((r: any) => r.job_id === selectedJobId);
        setResults(filtered as any);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load results');
    } finally {
      setLoading(false);
    }
  }

  async function handleRunBenchmark() {
    if (!selectedJobId) {
      setError('Please select a benchmark job first');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/benchmark/${selectedJobId}/run`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ version: selectedVersion }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.details || errorData.error || 'Failed to run benchmark');
      }

      const metrics = await response.json();
      console.log('Benchmark completed:', metrics);

      // Reload results
      await loadResults();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run benchmark');
    } finally {
      setLoading(false);
    }
  }

  // Simple line chart component
  function SimpleLineChart({ data, label, color }: { data: number[]; label: string; color: string }) {
    if (data.length === 0) return null;

    const max = Math.max(...data, 1);
    const min = Math.min(...data, 0);
    const range = max - min || 1;

    const points = data.map((value, index) => {
      const x = (index / (data.length - 1 || 1)) * 100;
      const y = 100 - ((value - min) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="bg-white rounded-lg p-4 border border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-2">{label}</h3>
        <div className="h-32 relative">
          <svg viewBox="0 0 100 100" className="w-full h-full">
            <polyline
              points={points}
              fill="none"
              stroke={color}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {data.map((value, index) => {
              const x = (index / (data.length - 1 || 1)) * 100;
              const y = 100 - ((value - min) / range) * 100;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="2"
                  fill={color}
                />
              );
            })}
          </svg>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          Latest: {(data[data.length - 1] * 100).toFixed(1)}%
        </div>
      </div>
    );
  }

  const selectedJob = benchmarkJobs.find(j => j.job_id === selectedJobId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Matching Performance Benchmark</h1>
          <p className="text-gray-600">Measure the accuracy and quality of the matching algorithm</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Benchmark Job
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">Select a job...</option>
                {benchmarkJobs.map((job) => (
                  <option key={job.id} value={job.job_id}>
                    {job.vacancies?.title || job.job_id} 
                    {job.vacancies?.location && ` - ${job.vacancies.location}`}
                  </option>
                ))}
              </select>
              {selectedJob && (
                <div className="mt-2 text-xs text-gray-500">
                  Ground truth: {selectedJob.ground_truth_candidates.length} candidates
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scoring Version
              </label>
              <select
                value={selectedVersion}
                onChange={(e) => setSelectedVersion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="all">All Versions</option>
                {versions.map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={handleRunBenchmark}
                disabled={loading || !selectedJobId}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-md flex items-center justify-center gap-2 transition-colors"
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Run Benchmark
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-6">
            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Precision@10</span>
                  <Target className="w-5 h-5 text-purple-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {(results[0]?.precision_10 * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">Recall@10</span>
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {(results[0]?.recall_10 * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">nDCG@10</span>
                  <BarChart3 className="w-5 h-5 text-green-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {(results[0]?.ndcg_10 * 100).toFixed(1)}%
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600">MRR</span>
                  <Target className="w-5 h-5 text-orange-600" />
                </div>
                <div className="text-3xl font-bold text-gray-900">
                  {(results[0]?.mrr * 100).toFixed(1)}%
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SimpleLineChart
                data={results.map(r => r.precision_10).reverse()}
                label="Precision@10 Over Time"
                color="#9333ea"
              />
              <SimpleLineChart
                data={results.map(r => r.recall_10).reverse()}
                label="Recall@10 Over Time"
                color="#2563eb"
              />
              <SimpleLineChart
                data={results.map(r => r.ndcg_10).reverse()}
                label="nDCG@10 Over Time"
                color="#16a34a"
              />
              <SimpleLineChart
                data={results.map(r => r.mrr).reverse()}
                label="MRR Over Time"
                color="#ea580c"
              />
            </div>

            {/* Detailed Results Table */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900">Detailed Results</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Timestamp
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Version
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precision@5
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Precision@10
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recall@5
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recall@10
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        nDCG@5
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        nDCG@10
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MRR
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {results.map((result) => (
                      <tr key={result.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(result.timestamp).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {result.version}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(result.precision_5 * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(result.precision_10 * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(result.recall_5 * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(result.recall_10 * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(result.ndcg_5 * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(result.ndcg_10 * 100).toFixed(1)}%
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(result.mrr * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {results.length === 0 && !loading && selectedJobId && (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Results Yet</h3>
            <p className="text-gray-600 mb-6">
              Run a benchmark to see performance metrics for this job.
            </p>
            <button
              onClick={handleRunBenchmark}
              disabled={loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-2 px-6 rounded-md inline-flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              Run Benchmark
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


