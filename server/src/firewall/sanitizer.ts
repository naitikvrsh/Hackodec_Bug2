import crypto from 'crypto';
import { CONFIG } from '../config.js';
import {
  CapabilityRestriction,
  Finding,
  PreprocessedOutput,
  SanitizationAction,
  SanitizationChange,
  SanitizedInput,
  Verdict,
} from '../types/index.js';

export interface SanitizationResult {
  sanitizedText: string;
  agentInput: string;
  changes: SanitizationChange[];
  residualRisk: number;
  residualFindings: Finding[];
  sanitizedInput: SanitizedInput;
}

/**
 * Escapes envelope closing and delimiter tags within content
 * to prevent jailbreak escapes from the trusted sandbox.
 */
export function escapeEnvelopeDelimiters(text: string): string {
  return text
    .replace(/<\/untrusted(?:_content)?>/gi, '&lt;/untrusted_content&gt;')
    .replace(/<untrusted(?:_content)?[^>]*>/gi, '&lt;untrusted_content&gt;')
    .replace(/<\/data>/gi, '&lt;/data&gt;')
    .replace(/<data>/gi, '&lt;data&gt;')
    .replace(/<\|im_start\|>/gi, '[escaped_im_start]')
    .replace(/<\|im_end\|>/gi, '[escaped_im_end]')
    .replace(/\[INST\]/gi, '[escaped_inst]')
    .replace(/\[\/INST\]/gi, '[escaped_end_inst]')
    .replace(/###\s*END\s*OF\s*(?:INPUT|TEXT|CONTEXT|DOCUMENT)/gi, '[escaped_end_marker]');
}

/**
 * Defangs a URL or markdown image by replacing protocol with hxxp and stripping query params.
 */
export function defangUrl(url: string): string {
  return url
    .replace(/^https?:\/\//i, (match) => match.toLowerCase().startsWith('https') ? 'hxxps://' : 'hxxp://')
    .replace(/\?.*$/, '?defanged=true');
}

/**
 * Primary Sanitizer that neutralizes flagged spans, preserves legitimate facts,
 * defangs exfiltration links, checks idempotency, and seals the output in an envelope.
 */
export function sanitizeContent(
  preprocessed: PreprocessedOutput,
  findings: Finding[],
  verdict: Verdict,
  riskScore: number,
  capabilityRestriction: CapabilityRestriction,
  rescanRulesFn: (text: string) => Finding[]
): SanitizationResult {
  let content = preprocessed.rawText;
  const changes: SanitizationChange[] = [];

  // Generate random canary token for this session
  const canaryToken = `CANARY-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;

  // If there are no findings and verdict is SAFE, minimal sanitation (escaping delimiters)
  if (findings.length === 0 || verdict === 'SAFE') {
    const escaped = escapeEnvelopeDelimiters(content);
    const agentEnvelope = `${CONFIG.ENVELOPE.OPEN_TAG}\n${escaped}\n${CONFIG.ENVELOPE.CLOSE_TAG}`;

    const sanitizedInput: SanitizedInput = {
      __brand: Symbol('SanitizedInput') as any,
      text: escaped,
      agentEnvelope,
      verdict: 'SAFE',
      riskScore: 0,
      findings: [],
      canaryToken,
      capabilityRestriction: 'full',
    };

    return {
      sanitizedText: escaped,
      agentInput: agentEnvelope,
      changes: [],
      residualRisk: 0,
      residualFindings: [],
      sanitizedInput,
    };
  }

  // 1. Process and strip hidden HTML and zero-width artifacts
  content = content.replace(/[\u200B-\u200D\uFEFF\u200E\u200F\u202A-\u202E\u2066-\u2069\u00AD]/g, '');

  // Strip hidden CSS elements
  content = content.replace(
    /<[a-z0-9]+\b[^>]*style\s*=\s*["'][^"']*(?:display\s*:\s*none|visibility\s*:\s*hidden|font-size\s*:\s*0|opacity\s*:\s*0)[^"']*["'][^>]*>[\s\S]*?<\/[a-z0-9]+>/gi,
    (match) => {
      changes.push({
        action: 'STRIP_HIDDEN',
        originalSpan: match,
        replacement: '',
        reason: 'Removed hidden HTML content concealed with CSS styling',
        ruleId: 'HIDDEN_CSS_ELEMENT',
        startOffset: 0,
        endOffset: match.length,
      });
      return '';
    }
  );

  // Strip HTML comments
  content = content.replace(/<!--[\s\S]*?-->/g, (match) => {
    changes.push({
      action: 'STRIP_HIDDEN',
      originalSpan: match,
      replacement: '',
      reason: 'Removed HTML comment containing hidden data or instructions',
      ruleId: 'HIDDEN_HTML_COMMENT',
      startOffset: 0,
      endOffset: match.length,
    });
    return '';
  });

  // Strip script and style tags
  content = content.replace(/<(?:script|style)\b[^>]*>[\s\S]*?<\/(?:script|style)>/gi, (match) => {
    changes.push({
      action: 'STRIP_HIDDEN',
      originalSpan: match,
      replacement: '',
      reason: 'Removed embedded script/style tag',
      ruleId: 'OUTPUT_XSS_OR_SCRIPT_PAYLOAD',
      startOffset: 0,
      endOffset: match.length,
    });
    return '';
  });

  // 2. Defang markdown image exfiltration
  content = content.replace(
    /!\[([^\]]*)\]\(((?:https?:\/\/|\/\/)[^\)]+)\)/gi,
    (match, alt, url) => {
      if (/[\?&](?:token|key|secret|cookie|data|exfil|leak|user|email|auth|q|payload)=/i.test(url)) {
        const defanged = `[defanged image: ${defangUrl(url)}]`;
        changes.push({
          action: 'DEFANG',
          originalSpan: match,
          replacement: defanged,
          reason: 'Defanged suspicious image exfiltration link',
          ruleId: 'DATA_EXFIL_MARKDOWN_IMAGE',
          startOffset: 0,
          endOffset: match.length,
        });
        return defanged;
      }
      return match;
    }
  );

  // 3. Neutralize flagged text segments or spans
  // Collect spans that need redaction or removal
  const spansToNeutralize: Array<{
    spanText: string;
    action: SanitizationAction;
    placeholder: string;
    ruleId: string;
    category: string;
    severity: number;
  }> = [];

  for (const finding of findings) {
    if (finding.severity < 30) continue; // Skip informational findings

    let action: SanitizationAction = 'REDACT_PLACEHOLDER';
    let placeholder = `[removed: ${finding.category.toLowerCase().replace(/_/g, ' ')}]`;

    if (finding.category === 'DATA_EXFILTRATION') {
      action = 'DEFANG';
      placeholder = '[redacted: exfiltration target]';
    } else if (verdict === 'MALICIOUS' || finding.severity >= 85) {
      action = 'REMOVE';
      placeholder = ''; // Completely remove malicious injection segments
    }

    spansToNeutralize.push({
      spanText: finding.evidenceText,
      action,
      placeholder,
      ruleId: finding.ruleId,
      category: finding.category,
      severity: finding.severity,
    });
  }

  // Sort spans to neutralize by length descending so larger sentences/blocks are neutralized before smaller sub-spans
  spansToNeutralize.sort((a, b) => (b.spanText?.length || 0) - (a.spanText?.length || 0));

  // Apply neutralization
  for (const item of spansToNeutralize) {
    if (!item.spanText || item.spanText.length < 3) continue;

    // Check if the evidenceText is present in content
    const idx = content.indexOf(item.spanText);
    if (idx !== -1) {
      content = content.split(item.spanText).join(item.placeholder);
      changes.push({
        action: item.action,
        originalSpan: item.spanText,
        replacement: item.placeholder,
        reason: `Neutralized flagged ${item.category} span`,
        ruleId: item.ruleId,
        startOffset: idx,
        endOffset: idx + item.spanText.length,
      });
    } else {
      // If evidenceText was from normalized text, search for segment in content
      for (const seg of preprocessed.segments.slice(1)) {
        if (seg.text.toLowerCase().includes(item.spanText.toLowerCase()) && content.includes(seg.text)) {
          content = content.replace(seg.text, item.placeholder);
          changes.push({
            action: item.action,
            originalSpan: seg.text,
            replacement: item.placeholder,
            reason: `Neutralized flagged segment matching ${item.category}`,
            ruleId: item.ruleId,
            startOffset: seg.startOffset,
            endOffset: seg.endOffset,
          });
          break;
        }
      }
    }
  }

  // Clean up residual multiple spaces resulting from removals
  content = content.replace(/[ \t]{2,}/g, ' ');

  // 4. Check if the entire input was only an attack (nothing legitimate left)
  const nonPlaceholderText = content
    .replace(/\[(?:removed|redacted|defanged)[^\]]*\]/gi, '')
    .trim();

  // If nothing legitimate remains (less than 10 non-whitespace alphanumeric characters)
  if (nonPlaceholderText.length < 10) {
    const fullReplacement = '[Content removed: entire input was a prompt-injection attempt]';
    changes.push({
      action: 'REMOVE',
      originalSpan: preprocessed.rawText.slice(0, 100),
      replacement: fullReplacement,
      reason: 'Entire input consisted of adversarial prompt injection without legitimate content',
      ruleId: 'ALL_CONTENT_REMOVED',
      startOffset: 0,
      endOffset: preprocessed.rawText.length,
    });
    content = fullReplacement;
  }

  // 5. Escape envelope delimiters inside content
  content = escapeEnvelopeDelimiters(content);

  // 6. Re-scan sanitized output once (Idempotency and sanity check)
  const residualFindings = rescanRulesFn(content);
  const residualRisk = residualFindings.length > 0
    ? Math.max(...residualFindings.map(f => f.severity))
    : 0;

  // If residual risk is still high, apply aggressive sanitization
  if (residualRisk >= CONFIG.THRESHOLDS.SAFE_MAX) {
    for (const resFinding of residualFindings) {
      if (content.includes(resFinding.evidenceText)) {
        content = content.replace(resFinding.evidenceText, '[removed: residual risk]');
        changes.push({
          action: 'REMOVE',
          originalSpan: resFinding.evidenceText,
          replacement: '[removed: residual risk]',
          reason: 'Escalated secondary strip during idempotency re-scan',
          ruleId: resFinding.ruleId,
          startOffset: 0,
          endOffset: resFinding.evidenceText.length,
        });
      }
    }
  }

  // 7. Seal inside untrusted data envelope
  const agentEnvelope = `${CONFIG.ENVELOPE.OPEN_TAG}\n${content.trim()}\n${CONFIG.ENVELOPE.CLOSE_TAG}`;

  const sanitizedInput: SanitizedInput = {
    __brand: Symbol('SanitizedInput') as any,
    text: content.trim(),
    agentEnvelope,
    verdict,
    riskScore,
    findings,
    canaryToken,
    capabilityRestriction,
  };

  return {
    sanitizedText: content.trim(),
    agentInput: agentEnvelope,
    changes,
    residualRisk,
    residualFindings,
    sanitizedInput,
  };
}
