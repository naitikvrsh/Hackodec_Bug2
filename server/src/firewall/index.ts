import crypto from 'crypto';
import { CONFIG } from '../config.js';
import {
  DetectionMode,
  Finding,
  FirewallResult,
  RuleCategory,
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
import { MLSemanticClassifier } from './mlClassifier.js';

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

    // 2b. Machine Learning Semantic Classification
    const mlClassifier = MLSemanticClassifier.getInstance();
    const mlPrediction = mlClassifier.classify(content);
    const detectionComponents: string[] = ['Context Analyzer', 'Rules Engine'];

    if (mlClassifier.isReady()) {
      detectionComponents.unshift(`AEGISGUARD Semantic ML Classifier (v${mlPrediction.modelVersion})`);
    }

    // 3. Rule Evaluation
    const rawRuleFindings = evaluateRules(preprocessed.segments);

    // If ML classifier detects clear malicious intent with high confidence, add ML finding
    const mlCategoryMap: Record<string, RuleCategory> = {
      violence_and_threats: 'VIOLENCE_AND_CREDIBLE_THREATS',
      killing_and_physical_harm: 'VIOLENCE_AND_CREDIBLE_THREATS',
      bomb_threats_and_explosives: 'WEAPONS_MISUSE',
      robbery_and_theft: 'ROBBERY_AND_THEFT',
      fraud_and_financial_deception: 'FINANCIAL_FRAUD',
      cyber_abuse_and_unauthorized_access: 'UNAUTHORIZED_ACCESS',
      malware_and_malicious_software: 'MALWARE_AND_RANSOMWARE',
      self_harm_and_suicide: 'SELF_HARM_METHOD_SEEKING',
      privacy_violations: 'PRIVACY_VIOLATION',
      weapons_misuse: 'WEAPONS_MISUSE',
      harassment_and_coercion: 'STALKING_AND_HARASSMENT',
      prompt_injection: 'INSTRUCTION_OVERRIDE',
    };

    const isAlreadySanitized = /\[(?:REDACTED|DEFANGED|CONTENT_FILTERED|SANITIZED|REMOVED|ESCAPED)[^\]]*\]/i.test(content) || content.startsWith('[Content removed:');
    const mlFindings: Finding[] = [];
    if (!isAlreadySanitized && mlPrediction.label === 'MALICIOUS' && mlPrediction.confidence >= 0.65) {
      const targetCat = mlCategoryMap[mlPrediction.category] || 'HARMFUL_CONTENT';

      // Check if text has multiple sentence segments and isolate the malicious sentence(s)
      const sentenceSegments = preprocessed.segments.slice(1);
      const maliciousSentences = sentenceSegments.filter(seg => {
        const segPred = mlClassifier.classify(seg.text);
        return segPred.label === 'MALICIOUS';
      });

      if (maliciousSentences.length > 0 && maliciousSentences.length < sentenceSegments.length) {
        for (const mSeg of maliciousSentences) {
          mlFindings.push({
            ruleId: 'ML_SEMANTIC_THREAT',
            category: targetCat,
            severity: Math.round(mlPrediction.confidence * 95),
            evidenceText: mSeg.text,
            startOffset: mSeg.startOffset,
            endOffset: mSeg.endOffset,
            segmentIndex: mSeg.index,
            explanation: mlPrediction.explanation,
            source: 'rule',
            intent: 'hostile',
          });
        }
      } else {
        mlFindings.push({
          ruleId: 'ML_SEMANTIC_THREAT',
          category: targetCat,
          severity: Math.round(mlPrediction.confidence * 95),
          evidenceText: content.length > 120 ? content.slice(0, 120) : content,
          startOffset: 0,
          endOffset: Math.min(content.length, 120),
          segmentIndex: 0,
          explanation: mlPrediction.explanation,
          source: 'rule', // Treated with primary finding weight
          intent: 'hostile',
        });
      }
    }

    // Combine raw rule findings with hidden & decoded artifacts and ML findings
    const allRawFindings = [
      ...preprocessed.hiddenFindings,
      ...preprocessed.decodedFindings,
      ...rawRuleFindings,
      ...mlFindings,
    ];

    // 4. Context Filtering (suppress benign human idioms, adjust educational mentions)
    const { adjustedFindings } = filterAndAdjustFindings(
      allRawFindings,
      taskContext,
      preprocessed
    );

    // 5. Preliminary Scoring
    let scoreResult = computeRiskScore(adjustedFindings, null);

    // If ML strongly classifies input as BENIGN (confidence >= 0.70) and task is non-adversarial,
    // dampen residual spurious keyword noise
    if (mlPrediction.label === 'BENIGN' && mlPrediction.confidence >= 0.70 && !preprocessed.hiddenFindings.length) {
      const hasDirectOverride = adjustedFindings.some(f => f.category === 'INSTRUCTION_OVERRIDE' && f.severity >= 90);
      if (!hasDirectOverride && scoreResult.riskScore < 70) {
        scoreResult.riskScore = Math.min(scoreResult.riskScore, 15);
        scoreResult.verdict = 'SAFE';
      }
    }

    // If ML marks input as NEEDS_REVIEW and score is in the ambiguous band, set review status
    if (mlPrediction.label === 'NEEDS_REVIEW' && scoreResult.verdict === 'SAFE' && scoreResult.riskScore >= 20) {
      scoreResult.verdict = 'SUSPICIOUS';
    }

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
      mlTelemetry: { ...mlPrediction, detectionComponents },
      detectionComponents,
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
      mlTelemetry: { ...mlPrediction, detectionComponents },
      detectionComponents,
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
