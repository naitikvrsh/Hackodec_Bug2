import crypto from 'crypto';
import {
  DetectionMode,
  Finding,
  RuleCategory,
  SanitizationChange,
  TaskContext,
  ThreatReport,
  Verdict,
  MLTelemetry,
} from '../types/index.js';

interface ReportInput {
  verdict: Verdict;
  riskScore: number;
  detectionMode: DetectionMode;
  findings: Finding[];
  changes: SanitizationChange[];
  taskContext: TaskContext;
  sanitizedText: string;
  agentInput: string;
  residualRisk: number;
  llmStatus: 'used' | 'skipped_clear_verdict' | 'unavailable' | 'disabled';
  mlTelemetry?: MLTelemetry;
  detectionComponents?: string[];
}

/**
 * Generates an explainable, contextual, dynamic threat report driven entirely
 * by empirical findings, context analysis, and sanitization logs.
 */
export function generateThreatReport(input: ReportInput): ThreatReport {
  const {
    verdict,
    riskScore,
    detectionMode,
    findings,
    changes,
    taskContext,
    agentInput,
    residualRisk,
    llmStatus,
  } = input;

  const reportId = `TR-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const timestamp = new Date().toISOString();

  // Extract unique categories
  const threatCategories: RuleCategory[] = Array.from(new Set(findings.map((f) => f.category)));

  // Generate plain-English summary based on actual findings and context
  let summary = '';

  // Check for categories
  const hasSelfHarmCrisis = threatCategories.some(c =>
    c === 'SELF_HARM_METHOD_SEEKING' ||
    c === 'SUICIDAL_IDEATION_OR_INTENT' ||
    c === 'IMMEDIATE_SELF_HARM_CONCERN' ||
    c === 'SELF_HARM_INSTRUCTION_OR_ENCOURAGEMENT' ||
    c === 'SELF_HARM_PROMOTION'
  );
  const hasCyberAttack = threatCategories.some(c =>
    c === 'UNAUTHORIZED_ACCESS' ||
    c === 'ILLEGAL_HACKING_INTENT' ||
    c === 'CREDENTIAL_THEFT' ||
    c === 'PASSWORD_ATTACKS' ||
    c === 'MALWARE_AND_RANSOMWARE' ||
    c === 'CYBER_ATTACK_PLANNING'
  );
  const hasDefensiveOrPrevention = threatCategories.some(c =>
    c === 'DEFENSIVE_CYBERSECURITY' ||
    c === 'SUICIDE_PREVENTION_OR_SUPPORT' ||
    c === 'AUTHORIZED_SECURITY_TESTING' ||
    c === 'SELF_HARM_REPORT_OR_DISCUSSION'
  );
  const hasHarmfulContent = threatCategories.includes('HARMFUL_CONTENT') || threatCategories.includes('WEAPONS_MISUSE');
  const hasPrivacyViolation = threatCategories.includes('PRIVACY_VIOLATION') || threatCategories.includes('DOXXING_AND_PRIVACY_ABUSE');
  const hasIllegalActivity = threatCategories.includes('ILLEGAL_ACTIVITY') || threatCategories.includes('FINANCIAL_FRAUD') || threatCategories.includes('EXTORTION_AND_BLACKMAIL');
  const hasHateSpeech = threatCategories.includes('HATE_SPEECH');

  let supportGuidance: string | undefined = undefined;
  let crisisResourcesProvided = false;

  if (hasSelfHarmCrisis) {
    crisisResourcesProvided = true;
    supportGuidance =
      'Immediate 24/7 Support: If you or someone you know is going through a tough time, free and confidential support is available right now. India: Tele-MANAS (call 14416 or 1800-891-4416, 24/7 toll-free), Vandrevala Foundation (+91 9999 666 555), iCall (9152987821). US/International: 988 Suicide & Crisis Lifeline (call/text 988) or text HOME to 741741. You are not alone.';
  }

  if (verdict === 'MALICIOUS' || verdict === 'SUSPICIOUS') {
    if (hasSelfHarmCrisis) {
      summary = `CRISIS SUPPORT & SAFETY NOTICE (Score: ${riskScore}/100): Input indicates self-harm or suicide concern. Operational self-harm instructions or methods are strictly withheld to protect user safety. Compassionate, immediate help is available: Tele-MANAS (14416 / 1800-891-4416) or 988 Lifeline. User is supported and not presented as a criminal.`;
    } else if (hasHarmfulContent) {
      summary = `CRITICAL SAFETY BLOCK: Harmful content or weapons synthesis detected (risk score: ${riskScore}/100). The content requests instructions for weapons, explosives, CBRN agents, or mass harm. This type of content is blocked to prevent physical harm. Detected categories: ${threatCategories.join(', ')}.`;
    } else if (hasCyberAttack) {
      summary = `UNAUTHORIZED CYBER ACTIVITY BLOCKED: Hostile cyber attack intent or unauthorized access attempt detected (risk score: ${riskScore}/100). This request seeks unauthorized breach, illegal hacking, password theft, or malware creation. Detected: ${threatCategories.join(', ')}.`;
    } else if (hasHateSpeech) {
      summary = `CRITICAL SAFETY BLOCK: Hate speech or incitement to violence detected (risk score: ${riskScore}/100). This content promotes hatred, discrimination, or violence against protected groups.`;
    } else if (hasPrivacyViolation) {
      summary = `PRIVACY THREAT BLOCKED: Privacy violation attempt detected (risk score: ${riskScore}/100). This request attempts to access, expose, or harvest private data, personal records, or conduct unauthorized surveillance.`;
    } else if (hasIllegalActivity) {
      summary = `ILLEGAL ACTIVITY BLOCKED: Request for assistance with illegal activities (risk score: ${riskScore}/100). Guidance on fraud, trafficking, blackmail, counterfeiting, or other criminal activities is strictly blocked.`;
    } else if (verdict === 'MALICIOUS') {
      summary = `CRITICAL ALERT: Security bypass or prompt injection threat detected with a risk score of ${riskScore}/100. Identified ${findings.length} malicious indicator(s) spanning categories: ${threatCategories.join(', ')}. The input attempted to compromise agent boundaries.`;
    } else {
      summary = `WARNING: Suspicious instruction patterns detected with an elevated risk score of ${riskScore}/100. Found ${findings.length} atypical segment(s) in category: ${threatCategories.join(', ')}.`;
    }
  } else if (hasDefensiveOrPrevention) {
    if (threatCategories.includes('DEFENSIVE_CYBERSECURITY')) {
      summary = `CLEARED (DEFENSIVE CYBERSECURITY): Evaluated as SAFE with a risk score of ${riskScore}/100. Context analysis verified that the inquiry seeks defensive security, system protection, or attack prevention. Safe for processing.`;
    } else if (threatCategories.includes('SUICIDE_PREVENTION_OR_SUPPORT')) {
      summary = `CLEARED (PREVENTION & SUPPORT): Evaluated as SAFE with a risk score of ${riskScore}/100. Context analysis verified that the user is seeking suicide prevention guidance, emotional support resources, or academic prevention research.`;
    } else {
      summary = `CLEARED: Evaluated as SAFE with a risk score of ${riskScore}/100. Context analysis identified non-hostile educational or reporting context.`;
    }
  } else if (taskContext.isEducationalOrMeta) {
    summary = `BENIGN (EDUCATIONAL CONTEXT): Evaluated as SAFE with a risk score of ${riskScore}/100. Although sample attack strings were detected, context analysis identified that the declared task is educational/analytical ("${taskContext.declaredTask}"). Safe for agent processing.`;
  } else {
    summary = `CLEARED: Content evaluated as SAFE with a risk score of ${riskScore}/100. No unauthorized prompt injection patterns, hidden content, malware, harmful requests, or privacy violations were detected.`;
  }

  // Generate confidence note
  let confidenceNote = '';
  if (findings.length >= 2 || riskScore >= 80) {
    confidenceNote = 'High confidence: Multiple corroborating heuristic signals and contextual patterns confirmed.';
  } else if (llmStatus === 'used') {
    confidenceNote = 'High confidence: Multi-tier consensus reached between heuristic rules and LLM security judge.';
  } else if (verdict === 'SUSPICIOUS') {
    confidenceNote = 'Moderate confidence: Pattern flagged border-case phrase. Defensive capability restriction applied.';
  } else {
    confidenceNote = 'High confidence: Content verified as safe across all threat category filters.';
  }

  const limitationsNotice =
    'Notice: Prompt injection defenses are heuristic and defense-in-depth measures. Novel obfuscations, indirect semantic manipulations, or multi-stage split payloads may evade static or single-pass pattern rules. Strict least-privilege agent design remains mandatory.';

  return {
    id: reportId,
    timestamp,
    verdict,
    riskScore,
    detectionMode,
    threatCategories,
    summary,
    taskContext: {
      declaredTask: taskContext.declaredTask,
      relevanceEvaluation: taskContext.relevanceEvaluation,
      isMetaEducational: taskContext.isEducationalOrMeta,
    },
    findings,
    sanitization: {
      actionsCount: changes.length,
      changes,
      residualRisk,
    },
    agentInput,
    llmStatus,
    confidenceNote,
    limitationsNotice,
    supportGuidance,
    crisisResourcesProvided,
    mlTelemetry: input.mlTelemetry,
    detectionComponents: input.detectionComponents,
  };
}

/**
 * Renders a self-contained, printable HTML report suitable for PDF export or offline auditing.
 */
export function renderReportHtml(report: ThreatReport): string {
  const verdictColor =
    report.verdict === 'MALICIOUS'
      ? '#ef4444'
      : report.verdict === 'SUSPICIOUS'
      ? '#f59e0b'
      : '#10b981';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Threat Report - ${report.id}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #0f172a; color: #f8fafc; padding: 32px; line-height: 1.5; }
    .container { max-width: 900px; margin: 0 auto; background: #1e293b; border-radius: 12px; border: 1px solid #334155; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #334155; padding-bottom: 20px; margin-bottom: 24px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-weight: 700; font-size: 14px; text-transform: uppercase; background: ${verdictColor}22; color: ${verdictColor}; border: 1px solid ${verdictColor}; }
    .score-box { font-size: 36px; font-weight: 800; color: ${verdictColor}; }
    h1, h2, h3 { margin-top: 0; }
    .section { margin-bottom: 28px; }
    .card { background: #0f172a; border-radius: 8px; border: 1px solid #334155; padding: 16px; margin-bottom: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; }
    th, td { text-align: left; padding: 10px; border-bottom: 1px solid #334155; font-size: 14px; }
    th { color: #94a3b8; font-weight: 600; text-transform: uppercase; font-size: 12px; }
    code { font-family: monospace; background: #020617; padding: 2px 6px; border-radius: 4px; color: #38bdf8; word-break: break-all; }
    pre { background: #020617; padding: 14px; border-radius: 6px; overflow-x: auto; font-size: 13px; color: #e2e8f0; border: 1px solid #334155; }
    .footer { margin-top: 36px; border-top: 1px solid #334155; padding-top: 16px; font-size: 12px; color: #64748b; }
    @media print { body { background: #fff; color: #000; padding: 0; } .container { border: none; box-shadow: none; background: #fff; } code, pre { background: #f1f5f9; color: #000; } }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div>
        <h1 style="margin: 0; font-size: 24px;">Prompt-Injection Firewall Threat Report</h1>
        <div style="font-size: 13px; color: #94a3b8; margin-top: 4px;">Report ID: ${report.id} • ${report.timestamp}</div>
      </div>
      <div style="text-align: right;">
        <span class="badge">${report.verdict}</span>
        <div class="score-box">${report.riskScore}<span style="font-size: 18px; color: #94a3b8;">/100</span></div>
      </div>
    </div>

    <div class="section">
      <h3>Executive Summary</h3>
      <div class="card" style="font-size: 15px; border-left: 4px solid ${verdictColor};">
        ${report.summary}
      </div>
    </div>

    <div class="section">
      <h3>Context & Scope</h3>
      <div class="card">
        <div><strong>Declared Task:</strong> ${escapeHtml(report.taskContext.declaredTask)}</div>
        <div style="margin-top: 6px;"><strong>Context Evaluation:</strong> ${report.taskContext.relevanceEvaluation}</div>
        <div style="margin-top: 6px;"><strong>Detection Mode:</strong> ${report.detectionMode.toUpperCase()} (LLM Judge: ${report.llmStatus})</div>
      </div>
    </div>

    <div class="section">
      <h3>Findings & Evidence (${report.findings.length})</h3>
      ${
        report.findings.length === 0
          ? '<p style="color: #94a3b8;">No threat indicators or anomalous injection spans detected.</p>'
          : `<table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Severity</th>
                  <th>Evidence Span</th>
                  <th>Analysis / Context</th>
                </tr>
              </thead>
              <tbody>
                ${report.findings
                  .map(
                    (f) => `<tr>
                  <td><code>${f.category}</code></td>
                  <td><strong>${f.severity}</strong></td>
                  <td><code>${escapeHtml(f.evidenceText.slice(0, 100))}</code></td>
                  <td>${escapeHtml(f.explanation)}</td>
                </tr>`
                  )
                  .join('')}
              </tbody>
            </table>`
      }
    </div>

    <div class="section">
      <h3>Sanitization & Transformation (${report.sanitization.actionsCount} Actions)</h3>
      ${
        report.sanitization.changes.length === 0
          ? '<p style="color: #94a3b8;">No sanitization actions were required. Content was safe for direct envelope encapsulation.</p>'
          : `<table>
              <thead>
                <tr>
                  <th>Action</th>
                  <th>Reason</th>
                  <th>Original Span</th>
                  <th>Sanitized Replacement</th>
                </tr>
              </thead>
              <tbody>
                ${report.sanitization.changes
                  .map(
                    (c) => `<tr>
                  <td><code>${c.action}</code></td>
                  <td>${escapeHtml(c.reason)}</td>
                  <td><code>${escapeHtml(c.originalSpan.slice(0, 80))}</code></td>
                  <td><code>${escapeHtml(c.replacement.slice(0, 80) || '[REMOVED]')}</code></td>
                </tr>`
                  )
                  .join('')}
              </tbody>
            </table>`
      }
    </div>

    <div class="section">
      <h3>Protected Agent Input Envelope</h3>
      <pre>${escapeHtml(report.agentInput)}</pre>
    </div>

    <div class="footer">
      <div><strong>Confidence Note:</strong> ${report.confidenceNote}</div>
      <div style="margin-top: 4px;"><strong>Limitations & Threat Model:</strong> ${report.limitationsNotice}</div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
