import crypto from 'crypto';
import { RuleCategory, Verdict } from '../types/index.js';

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

class AuditLogService {
  private events: AuditEvent[] = [];
  private readonly maxEvents = 200;

  recordEvent(params: {
    verdict: Verdict;
    riskScore: number;
    categories: RuleCategory[];
    rawContent: string;
    task: string;
    timingMs: number;
    detectionMode: string;
  }): AuditEvent {
    // Hash content to maintain privacy and prevent storing raw untrusted text
    const contentSha256 = crypto
      .createHash('sha256')
      .update(params.rawContent || '')
      .digest('hex');

    const event: AuditEvent = {
      id: `EVT-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`,
      timestamp: new Date().toISOString(),
      verdict: params.verdict,
      riskScore: params.riskScore,
      categories: params.categories,
      contentLength: (params.rawContent || '').length,
      contentSha256,
      taskSnippet: (params.task || '').slice(0, 60),
      timingMs: params.timingMs,
      detectionMode: params.detectionMode,
    };

    this.events.unshift(event);
    if (this.events.length > this.maxEvents) {
      this.events.pop();
    }

    return event;
  }

  getRecentEvents(limit: number = 50): AuditEvent[] {
    return this.events.slice(0, limit);
  }

  getStats(): {
    totalScans: number;
    verdicts: Record<Verdict, number>;
    categoryDistribution: Record<string, number>;
  } {
    const verdicts: Record<Verdict, number> = {
      SAFE: 0,
      SUSPICIOUS: 0,
      MALICIOUS: 0,
      ERROR_BLOCKED: 0,
    };

    const categoryDistribution: Record<string, number> = {};

    for (const event of this.events) {
      verdicts[event.verdict] = (verdicts[event.verdict] || 0) + 1;
      for (const cat of event.categories) {
        categoryDistribution[cat] = (categoryDistribution[cat] || 0) + 1;
      }
    }

    return {
      totalScans: this.events.length,
      verdicts,
      categoryDistribution,
    };
  }
}

export const auditLog = new AuditLogService();
