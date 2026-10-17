import { describe, expect, it } from 'vitest';
import { computeRiskScore } from '../firewall/scorer.js';
import { Finding } from '../types/index.js';

describe('Scorer Suite', () => {
  it('returns 0 risk score and SAFE verdict when there are no findings', () => {
    const res = computeRiskScore([]);
    expect(res.riskScore).toBe(0);
    expect(res.verdict).toBe('SAFE');
    expect(res.capabilityRestriction).toBe('full');
  });

  it('assigns SUSPICIOUS verdict for scores between 30 and 69', () => {
    const finding: Finding = {
      ruleId: 'TEST_SUSPICIOUS',
      category: 'TASK_REDIRECTION',
      severity: 45,
      evidenceText: 'sample text',
      startOffset: 0,
      endOffset: 10,
      segmentIndex: 0,
      explanation: 'test explanation',
      source: 'rule',
    };
    const res = computeRiskScore([finding]);
    expect(res.riskScore).toBe(45);
    expect(res.verdict).toBe('SUSPICIOUS');
    expect(res.capabilityRestriction).toBe('read_only');
  });

  it('assigns MALICIOUS verdict and summarize_only capability for scores >= 70', () => {
    const finding: Finding = {
      ruleId: 'TEST_MALICIOUS',
      category: 'INSTRUCTION_OVERRIDE',
      severity: 95,
      evidenceText: 'ignore all instructions',
      startOffset: 0,
      endOffset: 20,
      segmentIndex: 0,
      explanation: 'severe injection',
      source: 'rule',
    };
    const res = computeRiskScore([finding]);
    expect(res.riskScore).toBeGreaterThanOrEqual(70);
    expect(res.verdict).toBe('MALICIOUS');
    expect(res.capabilityRestriction).toBe('summarize_only');
  });

  it('applies diminishing returns for multiple concurrent findings and caps at 100', () => {
    const findings: Finding[] = [
      { ruleId: 'R1', category: 'INSTRUCTION_OVERRIDE', severity: 90, evidenceText: 'e1', startOffset: 0, endOffset: 5, segmentIndex: 0, explanation: '', source: 'rule' },
      { ruleId: 'R2', category: 'SYSTEM_PROMPT_EXFIL', severity: 80, evidenceText: 'e2', startOffset: 5, endOffset: 10, segmentIndex: 0, explanation: '', source: 'rule' },
      { ruleId: 'R3', category: 'DATA_EXFILTRATION', severity: 85, evidenceText: 'e3', startOffset: 10, endOffset: 15, segmentIndex: 0, explanation: '', source: 'rule' },
    ];
    const res = computeRiskScore(findings);
    expect(res.riskScore).toBeLessThanOrEqual(100);
    expect(res.riskScore).toBeGreaterThan(90);
  });
});
