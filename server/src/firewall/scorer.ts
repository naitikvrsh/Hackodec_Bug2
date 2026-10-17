import { CONFIG } from '../config.js';
import { CapabilityRestriction, Finding, LLMJudgeResult, Verdict } from '../types/index.js';

export interface ScoreComputationResult {
  riskScore: number;
  verdict: Verdict;
  capabilityRestriction: CapabilityRestriction;
  dominantCategory?: string;
  relativeIndicator: string;
}

/**
 * Computes a combined risk score from 0 to 100 using diminishing returns
 * across findings and context signals.
 */
export function computeRiskScore(
  findings: Finding[],
  llmResult?: LLMJudgeResult | null
): ScoreComputationResult {
  if (!findings || findings.length === 0) {
    return {
      riskScore: 0,
      verdict: 'SAFE',
      capabilityRestriction: 'full',
      relativeIndicator: 'Low / Negligible Risk',
    };
  }

  // Sort findings descending by severity
  const sortedFindings = [...findings].sort((a, b) => b.severity - a.severity);

  // Highest severity serves as base
  let aggregateScore = sortedFindings[0].severity;

  // Add diminishing returns for secondary findings
  for (let i = 1; i < sortedFindings.length; i++) {
    const additionalWeight = sortedFindings[i].severity / (3 * (i + 1));
    aggregateScore += additionalWeight;
  }

  // LLM Judge boost or dampening if present
  if (llmResult) {
    if (llmResult.is_injection && llmResult.confidence > 0.7) {
      aggregateScore = Math.max(aggregateScore, Math.round(llmResult.confidence * 90));
    } else if (!llmResult.is_injection && llmResult.confidence > 0.8 && aggregateScore < 70) {
      aggregateScore = Math.round(aggregateScore * 0.5);
    }
  }

  // Cap between 0 and 100
  const finalScore = Math.min(100, Math.max(0, Math.round(aggregateScore)));

  // Determine verdict based on centralized thresholds
  let verdict: Verdict = 'SAFE';
  let capabilityRestriction: CapabilityRestriction = 'full';
  let relativeIndicator = 'Low Risk';

  if (finalScore >= CONFIG.THRESHOLDS.MALICIOUS_MIN) {
    verdict = 'MALICIOUS';
    capabilityRestriction = 'summarize_only';
    relativeIndicator = 'Critical / Active Injection';
  } else if (finalScore >= CONFIG.THRESHOLDS.SAFE_MAX) {
    verdict = 'SUSPICIOUS';
    capabilityRestriction = 'read_only';
    relativeIndicator = 'Elevated Risk / Suspicious Pattern';
  } else {
    verdict = 'SAFE';
    capabilityRestriction = 'full';
    relativeIndicator = 'Minimal / Informational';
  }

  return {
    riskScore: finalScore,
    verdict,
    capabilityRestriction,
    dominantCategory: sortedFindings[0]?.category,
    relativeIndicator,
  };
}
