import React from 'react';
import { X, Download, FileCode, Shield, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { ThreatReport } from '../types';
import { downloadJson, downloadReportHtml } from '../api';

interface ThreatReportModalProps {
  report: ThreatReport | null;
  onClose: () => void;
}

export const ThreatReportModal: React.FC<ThreatReportModalProps> = ({ report, onClose }) => {
  if (!report) return null;

  const isMalicious = report.verdict === 'MALICIOUS' || report.verdict === 'ERROR_BLOCKED';
  const isSuspicious = report.verdict === 'SUSPICIOUS';

  const badgeColor = isMalicious
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    : isSuspicious
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

  const Icon = isMalicious ? AlertTriangle : isSuspicious ? AlertTriangle : CheckCircle2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="cyber-card w-full max-w-4xl max-h-[90vh] rounded-2xl border border-slate-700 flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border ${badgeColor}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-bold text-slate-100">Security Threat & Audit Report</h3>
                <span className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-full border ${badgeColor}`}>
                  {report.verdict}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                Report ID: {report.id} • {new Date(report.timestamp).toLocaleString()}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-sm text-slate-300">
          {/* Executive Summary */}
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Executive Summary</h4>
            <p className="text-slate-200 leading-relaxed">{report.summary}</p>
          </div>

          {/* Context Assessment */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Context & Declared Task</h4>
              <div>
                <span className="text-xs text-slate-400">Declared Task:</span>
                <p className="font-medium text-slate-200">"{report.taskContext.declaredTask}"</p>
              </div>
              <div className="pt-1">
                <span className="text-xs text-slate-400">Context Evaluation:</span>
                <p className="text-xs text-cyan-300">{report.taskContext.relevanceEvaluation}</p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Risk Metric & Scoring</h4>
              <div className="flex items-center space-x-4">
                <div className="text-3xl font-extrabold font-mono text-cyan-400">
                  {report.riskScore}<span className="text-sm font-normal text-slate-500">/100</span>
                </div>
                <div className="text-xs space-y-1">
                  <div><span className="text-slate-400">Mode:</span> <span className="font-semibold text-slate-200 uppercase">{report.detectionMode}</span></div>
                  <div><span className="text-slate-400">LLM Judge Status:</span> <span className="font-semibold text-slate-200">{report.llmStatus}</span></div>
                </div>
              </div>
            </div>
          </div>

          {/* Findings & Evidence */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Identified Threat Findings ({report.findings.length})
            </h4>
            {report.findings.length === 0 ? (
              <p className="text-xs text-slate-400 p-3 bg-slate-900/40 rounded-lg border border-slate-800">
                No threat indicators or injection patterns detected. Input aligns with declared task.
              </p>
            ) : (
              <div className="space-y-2">
                {report.findings.map((f, i) => (
                  <div key={i} className="p-3 bg-slate-900/80 border border-slate-800 rounded-lg space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-bold text-rose-400">{f.ruleId}</span>
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] uppercase">
                          {f.category}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-rose-300">Severity: {f.severity}/100</span>
                    </div>
                    <div className="font-mono text-xs bg-slate-950 p-2 rounded border border-slate-800/80 text-rose-300/90 break-all">
                      "{f.evidenceText}"
                    </div>
                    <p className="text-xs text-slate-400">{f.explanation}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Sanitized Envelope */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Protected Agent Envelope</h4>
            <pre className="p-3 bg-slate-950 border border-slate-800 rounded-lg font-mono text-xs text-cyan-300/90 overflow-x-auto max-h-[140px]">
              {report.agentInput}
            </pre>
          </div>

          {/* Limitations & Confidence Notice */}
          <div className="p-3 bg-slate-900/40 border border-slate-800/60 rounded-lg text-xs space-y-1 text-slate-400">
            <div><strong className="text-slate-300">Confidence Note:</strong> {report.confidenceNote}</div>
            <div><strong className="text-slate-300">Defense-in-Depth Notice:</strong> {report.limitationsNotice}</div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="text-xs text-slate-400 font-mono">
            {report.threatCategories.length} Threat Categories Flagged
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => downloadJson(report, `threat-report-${report.id}.json`)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold transition"
            >
              <FileCode className="w-3.5 h-3.5 text-cyan-400" />
              <span>Download JSON</span>
            </button>
            <button
              onClick={() => downloadReportHtml(report)}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-xs font-bold transition shadow-lg shadow-cyan-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export Printable Report</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
