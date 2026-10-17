import React, { useState } from 'react';
import { Finding, RuleCategory } from '../types';

interface HighlightedTextProps {
  text: string;
  findings: Finding[];
}

export const CATEGORY_COLORS: Record<RuleCategory, { bg: string; text: string; border: string; label: string }> = {
  INSTRUCTION_OVERRIDE: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500', label: 'Instruction Override' },
  SYSTEM_PROMPT_EXFIL: { bg: 'bg-orange-500/20', text: 'text-orange-300', border: 'border-orange-500', label: 'Prompt Exfiltration' },
  DATA_EXFILTRATION: { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500', label: 'Data Exfiltration' },
  ROLE_HIJACK: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500', label: 'Role Hijack / Jailbreak' },
  TOOL_ACTION_MANIPULATION: { bg: 'bg-rose-500/20', text: 'text-rose-300', border: 'border-rose-500', label: 'Tool Manipulation' },
  TASK_REDIRECTION: { bg: 'bg-yellow-500/20', text: 'text-yellow-300', border: 'border-yellow-500', label: 'Task Redirection' },
  CONCEALMENT: { bg: 'bg-violet-500/20', text: 'text-violet-300', border: 'border-violet-500', label: 'Concealment' },
  HIDDEN_CONTENT: { bg: 'bg-sky-500/20', text: 'text-sky-300', border: 'border-sky-500', label: 'Hidden Content' },
  AUTHORITY_IMPERSONATION: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500', label: 'Authority Impersonation' },
  DELIMITER_ESCAPE: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500', label: 'Delimiter Escape' },
  OUTPUT_MANIPULATION: { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500', label: 'Output Manipulation' },
};

export const HighlightedText: React.FC<HighlightedTextProps> = ({ text, findings }) => {
  const [activeFinding, setActiveFinding] = useState<Finding | null>(null);

  if (!findings || findings.length === 0) {
    return (
      <div className="font-mono text-xs sm:text-sm text-slate-300 whitespace-pre-wrap break-words leading-relaxed select-text p-4 bg-slate-900/40 rounded-lg border border-slate-800">
        {text}
      </div>
    );
  }

  // Find intervals corresponding to findings
  interface Interval {
    start: number;
    end: number;
    finding: Finding;
  }

  const intervals: Interval[] = [];
  for (const f of findings) {
    if (f.severity < 30) continue; // Skip informational downgraded mentions
    let start = f.startOffset;
    let end = f.endOffset;

    if (start === undefined || end === undefined || start < 0 || end <= start) {
      // Fallback: search for evidenceText in string
      if (f.evidenceText && f.evidenceText.length > 2) {
        const idx = text.indexOf(f.evidenceText);
        if (idx !== -1) {
          start = idx;
          end = idx + f.evidenceText.length;
        }
      }
    }

    if (start !== undefined && end !== undefined && end > start && start < text.length) {
      intervals.push({
        start: Math.max(0, start),
        end: Math.min(text.length, end),
        finding: f,
      });
    }
  }

  // Sort intervals by start offset
  intervals.sort((a, b) => a.start - b.start);

  // Build rendered fragments safely as React children (XSS safe)
  const fragments: React.ReactNode[] = [];
  let currentIdx = 0;

  for (let i = 0; i < intervals.length; i++) {
    const { start, end, finding } = intervals[i];

    if (start > currentIdx) {
      fragments.push(
        <span key={`text-${currentIdx}`}>{text.slice(currentIdx, start)}</span>
      );
    }

    if (end > currentIdx) {
      const matchStart = Math.max(currentIdx, start);
      const spanText = text.slice(matchStart, end);
      const styleConfig = CATEGORY_COLORS[finding.category] || {
        bg: 'bg-red-500/20',
        text: 'text-red-300',
        border: 'border-red-500',
        label: finding.category,
      };

      fragments.push(
        <mark
          key={`mark-${matchStart}-${end}`}
          onMouseEnter={() => setActiveFinding(finding)}
          onMouseLeave={() => setActiveFinding(null)}
          className={`cursor-pointer px-1 py-0.5 rounded transition-all font-mono font-medium border-b-2 ${styleConfig.bg} ${styleConfig.text} ${styleConfig.border}`}
          title={`${finding.category}: ${finding.explanation}`}
        >
          {spanText}
        </mark>
      );
      currentIdx = end;
    }
  }

  if (currentIdx < text.length) {
    fragments.push(
      <span key={`text-${currentIdx}`}>{text.slice(currentIdx)}</span>
    );
  }

  return (
    <div className="relative">
      <div className="font-mono text-xs sm:text-sm text-slate-300 whitespace-pre-wrap break-words leading-relaxed p-4 bg-slate-900/40 rounded-lg border border-slate-800">
        {fragments}
      </div>

      {activeFinding && (
        <div className="mt-3 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl text-xs space-y-1 animate-in fade-in duration-200">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-cyan-400 font-mono">{activeFinding.ruleId}</span>
            <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 font-bold">
              Severity: {activeFinding.severity}/100
            </span>
          </div>
          <div className="text-slate-300">{activeFinding.explanation}</div>
        </div>
      )}
    </div>
  );
};
