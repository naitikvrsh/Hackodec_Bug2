import { describe, expect, it } from 'vitest';
import { runFirewall } from '../firewall/index.js';

describe('Fail-Safe and Type Guard Suite', () => {
  it('engages ERROR_BLOCKED fail-safe when input exceeds maximum size limit', async () => {
    // Generate oversize payload (> 100 KB)
    const largeContent = 'A'.repeat(120 * 1024);
    const result = await runFirewall('Summarize document', largeContent, 'rules');

    expect(result.verdict).toBe('ERROR_BLOCKED');
    expect(result.riskScore).toBe(100);
    expect(result.sanitizedText).toContain('fail-safe');
    expect(result.agentInput).not.toContain(largeContent);
  });

  it('provides a branded SanitizedInput that wraps safe content only', async () => {
    const raw = 'Meeting at 3 PM in Room 101.';
    const result = await runFirewall('Meeting time', raw, 'rules');

    expect(result.sanitizedInput).toBeDefined();
    expect(result.sanitizedInput.verdict).toBe('SAFE');
    expect(result.sanitizedInput.agentEnvelope).toContain('<untrusted_content');
    expect(result.sanitizedInput.canaryToken).toMatch(/^CANARY-[A-F0-9]+/);
  });
});
