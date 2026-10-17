import crypto from 'crypto';
import { CONFIG } from '../config.js';
import {
  DetectionMode,
  Finding,
  FirewallResult,
  SanitizedInput,
  Verdict,
} from '../types/index.js';
import { analyzeTaskContext, filterAndAdjustFindings } from './contextAnalyzer.js';
import { runLLMJudge } from './llmJudge.js';
import { preprocessContent } from './preprocessor.js';
import { generateThreatReport } from './reportGenerator.js';
import { evaluateRules } from './rules.js';
import { sanitizeContent } from './sanitizer.js';
import { computeRiskScore } from './scorer.js';

/**
 * Rescans text using the rules library for idempotency validation.
 */
function rescanRules(text: string): Finding[] {
  const preprocessed = preprocessContent(text);
  return evaluateRules(preprocessed.segments);
}

/**
 * Executes the complete Firewall pipeline.
 * Guarantees fail-safe execution: if any uncaught error occurs, returns ERROR_BLOCKED
 * and never leaks raw content to downstream agents.
 */
export async function runFirewall(
  task: string,
  content: string,
  mode: DetectionMode = 'rules'
): Promise<FirewallResult> {
  const startTime = Date.now();

  try {
    // Content length guard
    if (content.length > CONFIG.LIMITS.MAX_CONTENT_LENGTH_BYTES) {
      throw new Error(`Content length exceeds maximum limit of ${CONFIG.LIMITS.MAX_CONTENT_LENGTH_BYTES} bytes`);
    }

    // 1. Preprocessor (normalization, decoding, hidden markup extraction, segmentation)
    const preprocessed = preprocessContent(content);

    // 2. Context Analysis (task intent, attack vs mention, imperative detection)
    const taskContext = analyzeTaskContext(task, content);

    // 3. Rule Evaluation
    const rawRuleFindings = evaluateRules(preprocessed.segments);

    // Combine raw rule findings with hidden & decoded artifacts
    const allRawFindings = [
      ...preprocessed.hiddenFindings,
      ...preprocessed.decodedFindings,
      ...rawRuleFindings,
    ];

    // 4. Context Filtering (suppress benign human idioms, adjust educational mentions)
    const { adjustedFindings } = filterAndAdjustFindings(
      allRawFindings,
      taskContext,
      preprocessed
    );

    // 5. Preliminary Scoring
    let scoreResult = computeRiskScore(adjustedFindings, null);

    // 6. Optional LLM Judge (only if mode is 'hybrid' and score is in the ambiguous band)
    let llmStatus: 'used' | 'skipped_clear_verdict' | 'unavailable' | 'disabled' = 'disabled';
    if (mode === 'hybrid') {
      const llmOutcome = await runLLMJudge(task, content, scoreResult.riskScore);
      llmStatus = llmOutcome.status;
      if (llmOutcome.used && llmOutcome.finding) {
        adjustedFindings.push(llmOutcome.finding);
        // Recompute score incorporating LLM outcome
        scoreResult = computeRiskScore(adjustedFindings, llmOutcome.rawResult);
      }
    } else {
      llmStatus = 'skipped_clear_verdict';
    }

    // 7. Sanitizer (neutralize, defang, strip hidden, idempotency check, envelope wrap)
    const sanitization = sanitizeContent(
      preprocessed,
      adjustedFindings,
      scoreResult.verdict,
      scoreResult.riskScore,
      scoreResult.capabilityRestriction,
      rescanRules
    );

    // 8. Generate Explainable Threat Report
    const report = generateThreatReport({
      verdict: scoreResult.verdict,
      riskScore: scoreResult.riskScore,
      detectionMode: mode,
      findings: adjustedFindings,
      changes: sanitization.changes,
      taskContext,
      sanitizedText: sanitization.sanitizedText,
      agentInput: sanitization.agentInput,
      residualRisk: sanitization.residualRisk,
      llmStatus,
    });

    const timingMs = Date.now() - startTime;

    return {
      verdict: scoreResult.verdict,
      riskScore: scoreResult.riskScore,
      findings: adjustedFindings,
      sanitizedText: sanitization.sanitizedText,
      agentInput: sanitization.agentInput,
      changes: sanitization.changes,
      report,
      timingMs,
      detectionMode: mode,
      canaryToken: sanitization.sanitizedInput.canaryToken,
      capabilityRestriction: scoreResult.capabilityRestriction,
      sanitizedInput: sanitization.sanitizedInput,
    };
  } catch (error: any) {
    // FAIL-SAFE: Never allow unhandled exceptions to pass raw content through
    const timingMs = Date.now() - startTime;
    const canaryToken = `CANARY-ERR-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const blockedMessage = '[Content blocked by firewall fail-safe due to processing exception]';
    const agentEnvelope = `${CONFIG.ENVELOPE.OPEN_TAG}\n${blockedMessage}\n${CONFIG.ENVELOPE.CLOSE_TAG}`;

    const failSafeSanitizedInput: SanitizedInput = {
      __brand: Symbol('SanitizedInput') as any,
      text: blockedMessage,
      agentEnvelope,
      verdict: 'ERROR_BLOCKED',
      riskScore: 100,
      findings: [],
      canaryToken,
      capabilityRestriction: 'summarize_only',
    };

    const failFinding: Finding = {
      ruleId: 'FAIL_SAFE_TRIGGERED',
      category: 'INSTRUCTION_OVERRIDE',
      severity: 100,
      evidenceText: 'Execution anomaly detected during firewall inspection',
      startOffset: 0,
      endOffset: 0,
      segmentIndex: 0,
      explanation: `Firewall fail-safe engaged: ${error?.message || 'Processing error'}`,
      source: 'rule',
    };

    const taskContext = analyzeTaskContext(task, '');
    const report = generateThreatReport({
      verdict: 'ERROR_BLOCKED',
      riskScore: 100,
      detectionMode: mode,
      findings: [failFinding],
      changes: [
        {
          action: 'REMOVE',
          originalSpan: 'Full input',
          replacement: blockedMessage,
          reason: 'Emergency fail-safe block to protect downstream agent',
          ruleId: 'FAIL_SAFE_TRIGGERED',
          startOffset: 0,
          endOffset: 0,
        },
      ],
      taskContext,
      sanitizedText: blockedMessage,
      agentInput: agentEnvelope,
      residualRisk: 0,
      llmStatus: 'unavailable',
    });

    return {
      verdict: 'ERROR_BLOCKED',
      riskScore: 100,
      findings: [failFinding],
      sanitizedText: blockedMessage,
      agentInput: agentEnvelope,
      changes: [
        {
          action: 'REMOVE',
          originalSpan: 'Full input',
          replacement: blockedMessage,
          reason: 'Emergency fail-safe block to protect downstream agent',
          ruleId: 'FAIL_SAFE_TRIGGERED',
          startOffset: 0,
          endOffset: 0,
        },
      ],
      report,
      timingMs,
      detectionMode: mode,
      canaryToken,
      capabilityRestriction: 'summarize_only',
      sanitizedInput: failSafeSanitizedInput,
    };
  }
}
