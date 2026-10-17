import { Router } from 'express';
import { z } from 'zod';
import { runProtectedAgent } from '../agent/demoAgent.js';
import { runSimulatedVulnerableAgent } from '../agent/simulatedVulnerableAgent.js';
import { auditLog } from '../audit/auditLog.js';
import { runFirewall } from '../firewall/index.js';

const router = Router();

const AgentRunSchema = z.object({
  task: z.string().min(1, 'Task is required').max(1000),
  content: z.string().max(100 * 1024, 'Content exceeds 100 KB limit'),
  agentType: z.enum(['email_summarizer', 'webpage_summarizer', 'document_qa']).default('email_summarizer'),
  mode: z.enum(['rules', 'hybrid']).optional().default('rules'),
});

router.post('/run', async (req, res, next) => {
  try {
    const { task, content, agentType, mode } = AgentRunSchema.parse(req.body);

    // 1. Process content through the complete firewall pipeline
    const firewallResult = await runFirewall(task, content, mode);

    // 2. Feed ONLY the branded SanitizedInput to the Protected Agent
    const protectedAgentResult = await runProtectedAgent(
      task,
      firewallResult.sanitizedInput,
      agentType
    );

    // 3. Run simulated vulnerable agent on raw input for sandbox comparison
    const simulatedUnprotected = runSimulatedVulnerableAgent(
      task,
      content,
      agentType
    );

    // Record audit event
    auditLog.recordEvent({
      verdict: firewallResult.verdict,
      riskScore: firewallResult.riskScore,
      categories: firewallResult.report.threatCategories,
      rawContent: content,
      task,
      timingMs: firewallResult.timingMs,
      detectionMode: mode,
    });

    return res.json({
      success: true,
      scan: {
        verdict: firewallResult.verdict,
        risk_score: firewallResult.riskScore,
        findings: firewallResult.findings,
        sanitized_text: firewallResult.sanitizedText,
        agent_input: firewallResult.agentInput,
        changes: firewallResult.changes,
        explanation: firewallResult.report.summary,
        timing_ms: firewallResult.timingMs,
        detection_mode: firewallResult.detectionMode,
        report: firewallResult.report,
      },
      agent_response: protectedAgentResult.response,
      agent_mode: protectedAgentResult.agentMode,
      protected: true,
      output_checks: protectedAgentResult.outputChecks,
      simulated_unprotected: simulatedUnprotected,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
