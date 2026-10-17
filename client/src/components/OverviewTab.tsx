import React from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Activity,
  BarChart,
  ArrowRight,
} from 'lucide-react';
import { AuditStats, BenchmarkMetrics, ConfigResponse } from '../types';

interface OverviewTabProps {
  metrics: BenchmarkMetrics | null;
  stats: AuditStats | null;
  config: ConfigResponse | null;
  onNavigateTab: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  metrics,
  stats,
  config,
  onNavigateTab,
}) => {
  const totalScans = stats?.totalScans || 0;
  const safeScans = stats?.verdicts.SAFE || 0;
  const suspiciousScans = stats?.verdicts.SUSPICIOUS || 0;
  const maliciousScans = stats?.verdicts.MALICIOUS || 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Hero Banner */}
      <div className="cyber-card p-6 sm:p-8 rounded-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-4">
            <ShieldCheck className="w-4 h-4" />
            <span>Next-Gen Prompt-Injection Security Layer</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-slate-100 tracking-tight leading-tight">
            Defense-in-Depth for Untrusted Agent Inputs
          </h1>
          <p className="mt-3 text-sm sm:text-base text-slate-400 leading-relaxed">
            A production-quality security layer between untrusted documents, emails, tool outputs, and downstream LLM agents.
            Features normalized preprocessors, categorized heuristic rules, attack-vs-mention context analysis, and
            strict data envelopment.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigateTab('scanner')}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-sm rounded-xl transition shadow-lg shadow-cyan-500/20"
            >
              <span>Open Scanner</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onNavigateTab('agent')}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold rounded-xl transition border border-slate-700"
            >
              <span>Test Protected Agent</span>
            </button>
            <button
              onClick={() => onNavigateTab('benchmark')}
              className="flex items-center space-x-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-sm font-semibold rounded-xl transition border border-slate-800"
            >
              <span>View Benchmark Lab</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confusion Matrix and Session Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Confusion Matrix */}
        <div className="cyber-card p-6 rounded-xl border border-slate-800">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center space-x-2">
            <BarChart className="w-4 h-4 text-cyan-400" />
            <span>Benchmark Confusion Matrix</span>
          </h3>

          {metrics ? (
            <div className="overflow-x-auto">
              <table className="w-full text-center text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="p-2 text-left font-sans">Ground Truth</th>
                    <th className="p-2 bg-slate-900/40 text-rose-400">Pred: Attack (Flagged)</th>
                    <th className="p-2 bg-slate-900/40 text-emerald-400">Pred: Benign (Safe)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  <tr>
                    <td className="p-3 text-left font-sans font-semibold text-slate-300">Actual Attack</td>
                    <td className="p-3 bg-red-950/30 text-rose-300 font-bold text-base border-r border-slate-800">
                      {metrics.tp} <span className="text-[10px] text-slate-500 block font-normal font-sans">True Positive</span>
                    </td>
                    <td className="p-3 bg-slate-900/30 text-slate-400 text-base">
                      {metrics.fn} <span className="text-[10px] text-slate-500 block font-normal font-sans">False Negative</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 text-left font-sans font-semibold text-slate-300">Actual Normal</td>
                    <td className="p-3 bg-slate-900/30 text-slate-400 text-base border-r border-slate-800">
                      {metrics.fp} <span className="text-[10px] text-slate-500 block font-normal font-sans">False Positive</span>
                    </td>
                    <td className="p-3 bg-emerald-950/30 text-emerald-300 font-bold text-base">
                      {metrics.tn} <span className="text-[10px] text-slate-500 block font-normal font-sans">True Negative</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-slate-500">Benchmark results will populate here.</div>
          )}
        </div>

        {/* Live Session Scans & Verdicts */}
        <div className="cyber-card p-6 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center space-x-2">
              <Activity className="w-4 h-4 text-cyan-400" />
              <span>Live Session Activity</span>
            </h3>

            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-900/40 text-center">
                <span className="text-xs text-emerald-400 font-medium block">Safe</span>
                <span className="text-2xl font-bold font-mono text-emerald-300">{safeScans}</span>
              </div>
              <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-900/40 text-center">
                <span className="text-xs text-amber-400 font-medium block">Suspicious</span>
                <span className="text-2xl font-bold font-mono text-amber-300">{suspiciousScans}</span>
              </div>
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-900/40 text-center">
                <span className="text-xs text-rose-400 font-medium block">Malicious</span>
                <span className="text-2xl font-bold font-mono text-rose-300">{maliciousScans}</span>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Total Scans This Session:</span>
                <span className="font-mono font-bold text-slate-200">{totalScans}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-slate-800">
                <span className="text-slate-400">Active Detection Engine:</span>
                <span className="font-semibold text-cyan-400">
                  {config?.llmStatus.available ? 'Hybrid (Rules + LLM Judge)' : 'Deterministic Rules Baseline'}
                </span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-slate-400">Protected Agent Mode:</span>
                <span className="font-semibold text-emerald-400">
                  {config?.llmStatus.available ? 'Gemini 1.5 Flash' : 'Local Extractive (Offline Safe)'}
                </span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onNavigateTab('activity')}
            className="mt-4 w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-lg border border-slate-800 transition"
          >
            View Redacted Audit Event Stream
          </button>
        </div>
      </div>
    </div>
  );
};
