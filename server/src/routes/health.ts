import { Router } from 'express';
import { isLLMAvailable } from '../config.js';

const router = Router();
const startTime = Date.now();

router.get('/', (req, res) => {
  return res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
    version: '1.0.0',
    llmAvailable: isLLMAvailable(),
  });
});

export default router;
