import { Router } from 'express';
import { z } from 'zod';
import { auditLog } from '../audit/auditLog.js';
import { renderReportHtml } from '../firewall/reportGenerator.js';
import { runFirewall } from '../firewall/index.js';

const router = Router();

const ScanRequestSchema = z.object({
  task: z.string().min(1, 'Task is required').max(1000),
  content: z.string().max(100 * 1024, 'Content exceeds 100 KB limit'),
  mode: z.enum(['rules', 'hybrid']).optional().default('rules'),
});

router.post('/', async (req, res, next) => {
  try {
    const { task, content, mode } = ScanRequestSchema.parse(req.body);

    const result = await runFirewall(task, content, mode);

    // Record in privacy-preserving audit log
    auditLog.recordEvent({
      verdict: result.verdict,
      riskScore: result.riskScore,
      categories: result.report.threatCategories,
      rawContent: content,
      task,
      timingMs: result.timingMs,
      detectionMode: mode,
    });

    // Check if client requested HTML report export
    if (req.query.format === 'html') {
      const html = renderReportHtml(result.report);
      res.setHeader('Content-Type', 'text/html');
      return res.send(html);
    }

    return res.json({
      success: true,
      verdict: result.verdict,
      risk_score: result.riskScore,
      findings: result.findings,
      sanitized_text: result.sanitizedText,
      agent_input: result.agentInput,
      changes: result.changes,
      explanation: result.report.summary,
      timing_ms: result.timingMs,
      detection_mode: result.detectionMode,
      report: result.report,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
