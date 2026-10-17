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
  HARMFUL_CONTENT: { bg: 'bg-red-700/30', text: 'text-red-200', border: 'border-red-700', label: '\u26A0 Harmful Content' },
  PRIVACY_VIOLATION: { bg: 'bg-indigo-500/20', text: 'text-indigo-300', border: 'border-indigo-500', label: 'Privacy Violation' },
  ILLEGAL_ACTIVITY: { bg: 'bg-orange-700/30', text: 'text-orange-200', border: 'border-orange-700', label: 'Illegal Activity' },
  SELF_HARM_PROMOTION: { bg: 'bg-rose-700/30', text: 'text-rose-200', border: 'border-rose-700', label: '\u26A0 Self-Harm Content' },
  HATE_SPEECH: { bg: 'bg-fuchsia-700/30', text: 'text-fuchsia-200', border: 'border-fuchsia-700', label: '\u26A0 Hate Speech' },
  // Dedicated Self-Harm & Suicide Categories
  SELF_HARM_METHOD_SEEKING: { bg: 'bg-rose-900/40', text: 'text-rose-200', border: 'border-rose-600', label: 'Self-Harm Method Seeking' },
  SUICIDAL_IDEATION_OR_INTENT: { bg: 'bg-rose-800/30', text: 'text-rose-300', border: 'border-rose-500', label: 'Suicidal Ideation / Intent' },
  IMMEDIATE_SELF_HARM_CONCERN: { bg: 'bg-red-900/50', text: 'text-red-200', border: 'border-red-600', label: 'Immediate Self-Harm Concern' },
  SELF_HARM_INSTRUCTION_OR_ENCOURAGEMENT: { bg: 'bg-red-950/60', text: 'text-red-300', border: 'border-red-700', label: 'Self-Harm Encouragement' },
  SELF_HARM_REPORT_OR_DISCUSSION: { bg: 'bg-slate-700/30', text: 'text-slate-300', border: 'border-slate-500', label: 'Self-Harm Discussion/Report' },
  SUICIDE_PREVENTION_OR_SUPPORT: { bg: 'bg-emerald-800/30', text: 'text-emerald-200', border: 'border-emerald-500', label: 'Suicide Prevention / Support' },
  // Cybersecurity & Illegal Activity Categories
  UNAUTHORIZED_ACCESS: { bg: 'bg-red-600/30', text: 'text-red-200', border: 'border-red-500', label: 'Unauthorized Access' },
  ILLEGAL_HACKING_INTENT: { bg: 'bg-amber-600/30', text: 'text-amber-200', border: 'border-amber-500', label: 'Illegal Hacking Intent' },
  CREDENTIAL_THEFT: { bg: 'bg-purple-600/30', text: 'text-purple-200', border: 'border-purple-500', label: 'Credential Theft' },
  PASSWORD_ATTACKS: { bg: 'bg-orange-600/30', text: 'text-orange-200', border: 'border-orange-500', label: 'Password Attack' },
  MALWARE_AND_RANSOMWARE: { bg: 'bg-red-800/40', text: 'text-red-200', border: 'border-red-600', label: 'Malware & Ransomware' },
  PHISHING_AND_SOCIAL_ENGINEERING: { bg: 'bg-yellow-600/30', text: 'text-yellow-200', border: 'border-yellow-500', label: 'Phishing & Social Eng.' },
  CYBER_ATTACK_PLANNING: { bg: 'bg-rose-700/30', text: 'text-rose-200', border: 'border-rose-600', label: 'Cyber Attack Planning' },
  AUTHORIZED_SECURITY_TESTING: { bg: 'bg-blue-600/20', text: 'text-blue-300', border: 'border-blue-400', label: 'Authorized Security Testing' },
  DEFENSIVE_CYBERSECURITY: { bg: 'bg-cyan-600/20', text: 'text-cyan-300', border: 'border-cyan-400', label: 'Defensive Cybersecurity' },
  // Other Harmful Categories
  VIOLENCE_AND_CREDIBLE_THREATS: { bg: 'bg-red-800/40', text: 'text-red-100', border: 'border-red-600', label: 'Violence & Credible Threat' },
  WEAPONS_MISUSE: { bg: 'bg-rose-900/40', text: 'text-rose-200', border: 'border-rose-600', label: 'Weapons & Explosives' },
  ROBBERY_AND_THEFT: { bg: 'bg-amber-700/30', text: 'text-amber-200', border: 'border-amber-600', label: 'Robbery & Theft' },
  FINANCIAL_FRAUD: { bg: 'bg-amber-800/30', text: 'text-amber-100', border: 'border-amber-500', label: 'Financial Fraud' },
  IDENTITY_THEFT_AND_FORGERY: { bg: 'bg-violet-700/30', text: 'text-violet-200', border: 'border-violet-500', label: 'Identity Theft & Forgery' },
  STALKING_AND_HARASSMENT: { bg: 'bg-pink-700/30', text: 'text-pink-200', border: 'border-pink-500', label: 'Stalking & Harassment' },
  DOXXING_AND_PRIVACY_ABUSE: { bg: 'bg-indigo-700/30', text: 'text-indigo-200', border: 'border-indigo-500', label: 'Doxxing & Privacy Abuse' },
  EXTORTION_AND_BLACKMAIL: { bg: 'bg-stone-700/40', text: 'text-stone-200', border: 'border-stone-500', label: 'Extortion & Blackmail' },
  MALICIOUS_DECEPTION: { bg: 'bg-yellow-700/30', text: 'text-yellow-100', border: 'border-yellow-600', label: 'Malicious Deception' },
  CHILD_SAFETY_AND_EXPLOITATION: { bg: 'bg-red-950/80', text: 'text-red-100', border: 'border-red-500', label: 'Child Safety Violation' },
  SEXUAL_HARASSMENT_AND_EXPLOITATION: { bg: 'bg-rose-950/70', text: 'text-rose-100', border: 'border-rose-600', label: 'Sexual Harassment/Exploitation' },
  PROMPT_INJECTION_AND_SAFETY_BYPASS: { bg: 'bg-red-600/30', text: 'text-red-200', border: 'border-red-500', label: 'Safety Bypass / Injection' },
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
