import { Router } from 'express';
import { CONFIG, isLLMAvailable } from '../config.js';

const router = Router();

router.get('/', (req, res) => {
  return res.json({
    success: true,
    version: '1.0.0',
    detectionModes: ['rules', 'hybrid'],
    llmStatus: {
      available: isLLMAvailable(),
      provider: isLLMAvailable() ? 'Google Gemini 1.5 Flash' : 'None (Using Local Extractive Engine)',
      modeActive: isLLMAvailable() ? 'Rules + LLM Judge (Hybrid capable)' : 'Rules-Only Baseline',
    },
    agentStatus: {
      modeActive: isLLMAvailable() ? 'Gemini 1.5 Flash' : 'Local Extractive Engine (Offline)',
    },
    thresholds: {
      safeMax: CONFIG.THRESHOLDS.SAFE_MAX,
      maliciousMin: CONFIG.THRESHOLDS.MALICIOUS_MIN,
      ambiguousBand: [CONFIG.THRESHOLDS.AMBIGUOUS_LOWER, CONFIG.THRESHOLDS.AMBIGUOUS_UPPER],
    },
    envelope: {
      openTag: CONFIG.ENVELOPE.OPEN_TAG,
      closeTag: CONFIG.ENVELOPE.CLOSE_TAG,
    },
    limits: {
      maxContentLengthBytes: CONFIG.LIMITS.MAX_CONTENT_LENGTH_BYTES,
    },
  });
});

export default router;
