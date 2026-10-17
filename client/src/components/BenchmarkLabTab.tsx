import React, { useState } from 'react';
import {
  Play,
  RotateCcw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ExternalLink,
  Shield,
  Layers,
  BarChart,
  ListFilter,
} from 'lucide-react';
import { BenchmarkMetrics, CaseResult } from '../types';
import { runBenchmarkApi } from '../api';
import { MLTrainingEvalSection } from './MLTrainingEvalSection';

interface BenchmarkLabTabProps {
  metrics: BenchmarkMetrics | null;
  onMetricsUpdated: (metrics: BenchmarkMetrics) => void;
  onOpenInScanner: (task: string, content: string) => void;
}

export const BenchmarkLabTab: React.FC<BenchmarkLabTabProps> = ({
  metrics,
  onMetricsUpdated,
  onOpenInScanner,
}) => {
  const [datasetType, setDatasetType] = useState<'main' | 'holdout' | 'all'>('main');
  const [detectionMode, setDetectionMode] = useState<'rules' | 'hybrid'>('rules');
  const [running, setRunning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'correct' | 'failures'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const handleRun = async () => {
    setRunning(true);
    try {
      const result = await runBenchmarkApi(datasetType, detectionMode);
      onMetricsUpdated(result);
    } catch (err: any) {
      alert(`Benchmark run failed: ${err?.message || 'Unknown error'}`);
    } finally {
      setRunning(false);
    }
  };

  const results = metrics?.results || [];

  // Filter cases
  const filteredResults = results.filter((r) => {
    const matchesSearch =
      r.task.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contentSnippet.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'correct'
        ? r.isCorrect
        : r.isFalsePositive || r.isFalseNegative;

    const matchesCategory =
      categoryFilter === 'all' ? true : r.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesCategory;
  });

  const failureCases = results.filter((r) => r.isFalsePositive || r.isFalseNegative);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Benchmark Header Controls */}
      <div className="cyber-card p-6 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold mb-2">
            <Shield className="w-3.5 h-3.5" />
            <span>Empirical Evaluation Harness</span>
          </div>
          <h2 className="text-xl font-bold text-slate-100">Benchmark Lab</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Evaluate the firewall engine against the Main split (70 cases) or the Held-Out validation split (44 cases).
            All numbers are computed on-demand through the exact same pipeline code path as <code className="text-cyan-400">/api/scan</code>.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={datasetType}
            onChange={(e) => setDatasetType(e.target.value as any)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-semibold text-slate-200 focus:outline-none focus:border-cyan-500"
          >
            <option value="main">Main Split (70 cases: 35+35)</option>
            <option value="holdout">Held-Out Split (44 cases: 22+22)</option>
            <option value="all">Unified Full Dataset (114 cases)</option>
          </select>

          <button
            onClick={handleRun}
            disabled={running}
            className="flex items-center space-x-2 px-5 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 font-bold text-xs rounded-xl transition shadow-lg shadow-cyan-500/20"
          >
            {running ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                <span>Evaluating...</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Execute Benchmark</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Per-Category Recall Table */}
      {metrics && metrics.perCategoryRecall && (
        <div className="cyber-card p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Per-Category Recall Across 11 Mandatory Threat Categories</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(metrics.perCategoryRecall).map(([cat, val]) => (
              <div
                key={cat}
                className="p-3 bg-slate-900/60 border border-slate-800/80 rounded-xl flex items-center justify-between"
              >
                <div>
                  <span className="font-mono text-xs font-semibold text-slate-200 block truncate max-w-[200px]">
                    {cat}
                  </span>
                  <span className="text-[10px] text-slate-500">
                    Detected: {val.detected} of {val.total} cases
                  </span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-cyan-400">
                    {(val.recall * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Discrepancies & Failure Section */}
      {metrics && (
        <div className="cyber-card p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-3 flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Recorded Discrepancies & Edge Cases</span>
          </h3>

          {failureCases.length === 0 ? (
            <div className="p-4 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>
                Zero false positives and zero false negatives recorded on this benchmark execution! All {metrics.total} cases classified correctly.
              </span>
            </div>
          ) : (
            <div className="space-y-2">
              {failureCases.map((f) => (
                <div key={f.id} className="p-3 bg-slate-900 border border-rose-900/40 rounded-xl text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-rose-400">[{f.id}] Actual: {f.label} → Predicted: {f.predictedVerdict}</span>
                    <button
                      onClick={() => onOpenInScanner(f.task, f.contentSnippet)}
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      <span>Open in Scanner</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>
                  <p className="text-slate-300">Task: "{f.task}"</p>
                  <p className="text-slate-500 font-mono text-[11px] truncate">Snippet: "{f.contentSnippet}"</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Test Case Browser Table */}
      {metrics && (
        <div className="cyber-card p-6 rounded-2xl border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div className="flex items-center space-x-2">
              <ListFilter className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider">
                Interactive Case Explorer ({filteredResults.length} / {results.length})
              </h3>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter cases..."
                  className="pl-8 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-300"
              >
                <option value="all">All Outcomes</option>
                <option value="correct">Correctly Classified</option>
                <option value="failures">Discrepancies</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[450px] overflow-y-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="bg-slate-900/80 sticky top-0 border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Case ID</th>
                  <th className="p-2.5">Ground Truth</th>
                  <th className="p-2.5">Category</th>
                  <th className="p-2.5">Predicted Verdict</th>
                  <th className="p-2.5">Score</th>
                  <th className="p-2.5">Task & Snippet</th>
                  <th className="p-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredResults.map((r) => {
                  const isSuccess = r.isCorrect;
                  return (
                    <tr key={r.id} className="hover:bg-slate-900/40 transition">
                      <td className="p-2.5 font-bold text-slate-300 whitespace-nowrap">{r.id}</td>
                      <td className="p-2.5 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.label === 'MALICIOUS'
                              ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {r.label}
                        </span>
                      </td>
                      <td className="p-2.5 text-slate-400 whitespace-nowrap">{r.category}</td>
                      <td className="p-2.5 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          {isSuccess ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 text-rose-400" />
                          )}
                          <span className="font-bold text-slate-200">{r.predictedVerdict}</span>
                        </div>
                      </td>
                      <td className="p-2.5 font-bold text-cyan-400">{r.predictedScore}</td>
                      <td className="p-2.5 max-w-xs truncate text-slate-400">
                        <span className="text-slate-300 font-sans block">{r.task}</span>
                        <span className="text-[11px] text-slate-500 truncate block">"{r.contentSnippet}"</span>
                      </td>
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={() => onOpenInScanner(r.task, r.contentSnippet)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded text-[11px] transition inline-flex items-center space-x-1"
                        >
                          <span>Test in Scanner</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dedicated Machine Learning Training Dataset & Evaluation Section */}
      <MLTrainingEvalSection onOpenInScanner={onOpenInScanner} />
    </div>
  );
};
