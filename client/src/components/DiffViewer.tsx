import React, { useState } from 'react';
import { Copy, Check, ArrowRight, ShieldCheck, FileText } from 'lucide-react';
import { SanitizationChange } from '../types';

interface DiffViewerProps {
  originalText: string;
  sanitizedText: string;
  changes: SanitizationChange[];
}

export const DiffViewer: React.FC<DiffViewerProps> = ({
  originalText,
  sanitizedText,
  changes,
}) => {
  const [copiedOriginal, setCopiedOriginal] = useState(false);
  const [copiedSanitized, setCopiedSanitized] = useState(false);

  const handleCopy = (text: string, isOriginal: boolean) => {
    navigator.clipboard.writeText(text);
    if (isOriginal) {
      setCopiedOriginal(true);
      setTimeout(() => setCopiedOriginal(false), 2000);
    } else {
      setCopiedSanitized(true);
      setTimeout(() => setCopiedSanitized(false), 2000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Side-by-Side View */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original Untrusted Input */}
        <div className="cyber-card p-4 rounded-xl border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Original Untrusted Content</span>
            </div>
            <button
              onClick={() => handleCopy(originalText, true)}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
            >
              {copiedOriginal ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedOriginal ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="font-mono text-xs text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-900 whitespace-pre-wrap break-words flex-1 min-h-[140px] max-h-[300px] overflow-y-auto">
            {originalText}
          </div>
        </div>

        {/* Sanitized Protected Output */}
        <div className="cyber-card p-4 rounded-xl border border-slate-800 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Sanitized Safe Content</span>
            </div>
            <button
              onClick={() => handleCopy(sanitizedText, false)}
              className="flex items-center space-x-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition"
            >
              {copiedSanitized ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSanitized ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
          <div className="font-mono text-xs text-emerald-300/90 bg-slate-950/60 p-3 rounded-lg border border-slate-900 whitespace-pre-wrap break-words flex-1 min-h-[140px] max-h-[300px] overflow-y-auto">
            {sanitizedText}
          </div>
        </div>
      </div>

      {/* Applied Transformations Audit Log */}
      {changes && changes.length > 0 && (
        <div className="cyber-card p-4 rounded-xl border border-slate-800">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Sanitization Audit Trail ({changes.length} transformations applied)
          </h4>
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {changes.map((c, i) => (
              <div
                key={i}
                className="text-xs p-2.5 bg-slate-900/60 border border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[10px]">
                    {c.action}
                  </span>
                  <span className="text-slate-300">{c.reason}</span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] font-mono">
                  <span className="line-through text-rose-400/80 bg-rose-950/40 px-2 py-0.5 rounded truncate max-w-[150px]">
                    {c.originalSpan}
                  </span>
                  <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                  <span className="text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded truncate max-w-[150px]">
                    {c.replacement || '[REMOVED]'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
