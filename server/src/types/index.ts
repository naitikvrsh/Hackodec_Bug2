/**
 * Core type definitions for the Prompt-Injection Firewall and Protected Agent.
 */

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
  | 'OUTPUT_MANIPULATION'
  | 'HARMFUL_CONTENT'
  | 'PRIVACY_VIOLATION'
  | 'ILLEGAL_ACTIVITY'
  | 'SELF_HARM_PROMOTION'
  | 'HATE_SPEECH'
  // Dedicated Self-Harm & Suicide Categories
  | 'SELF_HARM_METHOD_SEEKING'
  | 'SUICIDAL_IDEATION_OR_INTENT'
  | 'IMMEDIATE_SELF_HARM_CONCERN'
  | 'SELF_HARM_INSTRUCTION_OR_ENCOURAGEMENT'
  | 'SELF_HARM_REPORT_OR_DISCUSSION'
  | 'SUICIDE_PREVENTION_OR_SUPPORT'
  // Cybersecurity & Illegal Activity Categories
  | 'UNAUTHORIZED_ACCESS'
  | 'ILLEGAL_HACKING_INTENT'
  | 'CREDENTIAL_THEFT'
  | 'PASSWORD_ATTACKS'
  | 'MALWARE_AND_RANSOMWARE'
  | 'PHISHING_AND_SOCIAL_ENGINEERING'
  | 'CYBER_ATTACK_PLANNING'
  | 'AUTHORIZED_SECURITY_TESTING'
  | 'DEFENSIVE_CYBERSECURITY'
  // Other Harmful Categories
  | 'VIOLENCE_AND_CREDIBLE_THREATS'
  | 'WEAPONS_MISUSE'
  | 'ROBBERY_AND_THEFT'
  | 'FINANCIAL_FRAUD'
  | 'IDENTITY_THEFT_AND_FORGERY'
  | 'STALKING_AND_HARASSMENT'
  | 'DOXXING_AND_PRIVACY_ABUSE'
  | 'EXTORTION_AND_BLACKMAIL'
  | 'MALICIOUS_DECEPTION'
  | 'CHILD_SAFETY_AND_EXPLOITATION'
  | 'SEXUAL_HARASSMENT_AND_EXPLOITATION'
  | 'PROMPT_INJECTION_AND_SAFETY_BYPASS';

export type Verdict = 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS' | 'ERROR_BLOCKED' | 'NEEDS_REVIEW' | 'BENIGN' | 'PROMPT_INJECTION';

export interface MLTelemetry {
  label: 'MALICIOUS' | 'BENIGN' | 'NEEDS_REVIEW';
  category: string;
  confidence: number;
  isCalibrated: boolean;
  probabilities: {
    MALICIOUS: number;
    BENIGN: number;
    NEEDS_REVIEW: number;
  };
  latencyMs: number;
  explanation: string;
  modelVersion: string;
  modelStatus: 'ready' | 'missing' | 'error';
  detectionComponents: string[];
}

export type DetectionMode = 'rules' | 'hybrid';

export type SanitizationAction =
  | 'REMOVE'
  | 'REDACT_PLACEHOLDER'
  | 'STRIP_HIDDEN'
  | 'DEFANG'
  | 'DECODE_REMOVE';

export interface Finding {
  ruleId: string;
  category: RuleCategory;
  severity: number; // 1 - 100
  evidenceText: string;
  startOffset: number;
  endOffset: number;
  segmentIndex: number;
  explanation: string;
  source: 'rule' | 'llm' | 'context' | 'hidden';
  intent?: 'hostile' | 'defensive' | 'educational' | 'preventive' | 'victim_report' | 'quoted' | 'negated' | 'crisis';
  supportGuidance?: string;
}

export interface SanitizationChange {
  action: SanitizationAction;
  originalSpan: string;
  replacement: string;
  reason: string;
  ruleId?: string;
  startOffset: number;
  endOffset: number;
}

export interface TaskContext {
  declaredTask: string;
  isEducationalOrMeta: boolean;
  relevanceEvaluation: string;
  imperativesCount: number;
  addressedToAgent: boolean;
  hasNegation?: boolean;
  hasQuotation?: boolean;
  isVictimReport?: boolean;
  isDefensiveSecurity?: boolean;
  isPreventionOrSupport?: boolean;
}

export interface ThreatReport {
  id: string;
  timestamp: string;
  verdict: Verdict;
  riskScore: number;
  detectionMode: DetectionMode;
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
  supportGuidance?: string;
  crisisResourcesProvided?: boolean;
  mlTelemetry?: MLTelemetry;
  detectionComponents?: string[];
}

export type CapabilityRestriction = 'full' | 'read_only' | 'summarize_only';

/**
 * Branded type ensuring the Protected Agent can ONLY consume sanitized input
 * originating from the firewall pipeline.
 */
export type SanitizedInput = {
  readonly __brand: unique symbol;
  readonly text: string;
  readonly agentEnvelope: string;
  readonly verdict: Verdict;
  readonly riskScore: number;
  readonly findings: Finding[];
  readonly canaryToken: string;
  readonly capabilityRestriction: CapabilityRestriction;
};

export interface FirewallResult {
  verdict: Verdict;
  riskScore: number;
  findings: Finding[];
  sanitizedText: string;
  agentInput: string;
  changes: SanitizationChange[];
  report: ThreatReport;
  timingMs: number;
  detectionMode: DetectionMode;
  canaryToken: string;
  capabilityRestriction: CapabilityRestriction;
  sanitizedInput: SanitizedInput;
  mlTelemetry?: MLTelemetry;
  detectionComponents?: string[];
}

export interface Segment {
  index: number;
  text: string;
  normalizedText: string;
  startOffset: number;
  endOffset: number;
  isHidden: boolean;
  hiddenType?: string;
  isDecoded: boolean;
  decodedSource?: string;
}

export interface PreprocessedOutput {
  rawText: string;
  normalizedText: string;
  segments: Segment[];
  hiddenFindings: Finding[];
  decodedFindings: Finding[];
  offsetMap: number[]; // maps normalized index to original text index
}

export interface RuleDefinition {
  id: string;
  category: RuleCategory;
  severity: number;
  description: string;
  match: (text: string, segment: Segment) => { matched: boolean; span?: string; start?: number; end?: number } | null;
}

export interface LLMJudgeResult {
  is_injection: boolean;
  confidence: number; // 0 - 1
  category: RuleCategory;
  evidence_span: string;
  reasoning: string;
}

export interface ScanRequest {
  task: string;
  content: string;
  mode?: DetectionMode;
}

export type AgentType = 'email_summarizer' | 'webpage_summarizer' | 'document_qa';

export interface AgentRunRequest {
  task: string;
  content: string;
  agentType: AgentType;
  mode?: DetectionMode;
}

export interface AgentOutputCheck {
  canaryLeaked: boolean;
  unexpectedUrls: string[];
  unexpectedEmails: string[];
  actionRequestsDetected: boolean;
  safe: boolean;
  details?: string;
}

export interface AgentRunResponse {
  scan: FirewallResult;
  agentResponse: string;
  agentMode: 'gemini' | 'local_extractive';
  protected: boolean;
  outputChecks: AgentOutputCheck;
  simulatedUnprotected?: {
    rawResponse: string;
    exploitOccurred: boolean;
    exploitSummary: string;
  };
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
