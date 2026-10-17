export type Verdict = 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS' | 'ERROR_BLOCKED';

export type RuleCategory =
  | 'INSTRUCTION_OVERRIDE'
  | 'SYSTEM_PROMPT_EXFIL'
  | 'DATA_EXFILTRATION'
  | 'ROLE_HIJACK'
  | 'TOOL_ACTION_MANIPULATION'
  | 'TASK_REDIRECTION'
  | 'CONCEALMENT'
  | 'HIDDEN_CONTENT'
  | 'AUTHORITY_IMPERSONATION'
  | 'DELIMITER_ESCAPE'
  | 'OUTPUT_MANIPULATION';

export interface Finding {
  ruleId: string;
  category: RuleCategory;
  severity: number;
  evidenceText: string;
  startOffset: number;
  endOffset: number;
  segmentIndex: number;
  explanation: string;
  source: 'rule' | 'llm' | 'context' | 'hidden';
}

export interface SanitizationChange {
  action: 'REMOVE' | 'REDACT_PLACEHOLDER' | 'STRIP_HIDDEN' | 'DEFANG' | 'DECODE_REMOVE';
  originalSpan: string;
  replacement: string;
  reason: string;
  ruleId?: string;
  startOffset: number;
  endOffset: number;
}

export interface ThreatReport {
  id: string;
  timestamp: string;
  verdict: Verdict;
  riskScore: number;
  detectionMode: 'rules' | 'hybrid';
  threatCategories: RuleCategory[];
  summary: string;
  taskContext: {
    declaredTask: string;
    relevanceEvaluation: string;
    isMetaEducational: boolean;
  };
  findings: Finding[];
  sanitization: {
    actionsCount: number;
    changes: SanitizationChange[];
    residualRisk: number;
  };
  agentInput: string;
  llmStatus: 'used' | 'skipped_clear_verdict' | 'unavailable' | 'disabled';
  confidenceNote: string;
  limitationsNotice: string;
}

export interface ScanResponse {
  success: boolean;
  verdict: Verdict;
  risk_score: number;
  findings: Finding[];
  sanitized_text: string;
  agent_input: string;
  changes: SanitizationChange[];
  explanation: string;
  timing_ms: number;
  detection_mode: 'rules' | 'hybrid';
  report: ThreatReport;
}

export interface AgentOutputCheck {
  canaryLeaked: boolean;
  unexpectedUrls: string[];
  unexpectedEmails: string[];
  actionRequestsDetected: boolean;
  safe: boolean;
  details?: string;
}

export interface SimulatedUnprotected {
  rawResponse: string;
  exploitOccurred: boolean;
  exploitSummary: string;
}

export interface AgentRunResponse {
  success: boolean;
  scan: ScanResponse;
  agent_response: string;
  agent_mode: 'gemini' | 'local_extractive';
  protected: boolean;
  output_checks: AgentOutputCheck;
  simulated_unprotected: SimulatedUnprotected;
}

export interface PresetSample {
  id: string;
  name: string;
  task: string;
  content: string;
  description: string;
}

export interface BenchmarkCase {
  id: string;
  task: string;
  content: string;
  label: 'MALICIOUS' | 'NORMAL';
  category: RuleCategory | 'BENIGN';
  expectedFacts?: string[];
  notes: string;
}

export interface CaseResult {
  id: string;
  task: string;
  label: 'MALICIOUS' | 'NORMAL';
  category: string;
  predictedVerdict: Verdict;
  predictedScore: number;
  isCorrect: boolean;
  isFalsePositive: boolean;
  isFalseNegative: boolean;
  neutralizationSuccess?: boolean;
  factPreservationScore?: number;
  timingMs: number;
  findingsCount: number;
  contentSnippet: string;
  notes?: string;
}

export interface BenchmarkMetrics {
  total: number;
  attacksCount: number;
  normalCount: number;
  tp: number;
  fp: number;
  tn: number;
  fn: number;
  precision: number;
  recall: number;
  accuracy: number;
  f1: number;
  neutralizationRate: number;
  factPreservationRate: number;
  strictMetrics: {
    tp: number;
    fp: number;
    tn: number;
    fn: number;
    precision: number;
    recall: number;
    f1: number;
  };
  perCategoryRecall: Record<string, { total: number; detected: number; recall: number }>;
  averageTimingMs: number;
  timestamp: string;
  results: CaseResult[];
}

export interface AuditEvent {
  id: string;
  timestamp: string;
  verdict: Verdict;
  riskScore: number;
  categories: RuleCategory[];
  contentLength: number;
  contentSha256: string;
  taskSnippet: string;
  timingMs: number;
  detectionMode: string;
}

export interface AuditStats {
  totalScans: number;
  verdicts: Record<Verdict, number>;
  categoryDistribution: Record<string, number>;
}

export interface ConfigResponse {
  success: boolean;
  version: string;
  detectionModes: string[];
  llmStatus: {
    available: boolean;
    provider: string;
    modeActive: string;
  };
  agentStatus: {
    modeActive: string;
  };
  thresholds: {
    safeMax: number;
    maliciousMin: number;
    ambiguousBand: [number, number];
  };
  limits: {
    maxContentLengthBytes: number;
  };
}
