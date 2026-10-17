import { Router } from 'express';
import { auditLog } from '../audit/auditLog.js';

const router = Router();

router.get('/', (req, res) => {
  const limit = parseInt(req.query.limit as string, 10) || 50;
  const recentEvents = auditLog.getRecentEvents(limit);
  const stats = auditLog.getStats();

  return res.json({
    success: true,
    stats,
    events: recentEvents,
  });
});

export default router;
