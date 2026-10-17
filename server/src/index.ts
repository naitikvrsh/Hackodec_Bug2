import crypto from 'crypto';
import path from 'path';
import cors from 'cors';
import express, { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { ZodError } from 'zod';
import { CONFIG } from './config.js';

// Route handlers
import agentRoutes from './routes/agent.js';
import benchmarkRoutes from './routes/benchmark.js';
import casesRoutes from './routes/cases.js';
import configRoutes from './routes/config.js';
import healthRoutes from './routes/health.js';
import scanRoutes from './routes/scan.js';
import eventsRoutes from './routes/events.js';
import { mlRouter } from './routes/ml.js';

const app = express();

// Request ID middleware for end-to-end traceability
app.use((req: Request, res: Response, next: NextFunction) => {
  const reqId = req.headers['x-request-id'] || `req-${Date.now().toString(36)}-${crypto.randomBytes(2).toString('hex')}`;
  req.headers['x-request-id'] = reqId;
  res.setHeader('X-Request-Id', reqId);
  next();
});

// Security headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // Allows flexible UI rendering in unified Docker container
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  })
);

// Rate Limiting
const apiLimiter = rateLimit({
  windowMs: CONFIG.LIMITS.RATE_LIMIT_WINDOW_MS,
  max: CONFIG.LIMITS.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please slow down and try again shortly.',
  },
});
app.use('/api/', apiLimiter);

// Body parser with 100 KB limit
app.use(express.json({ limit: `${CONFIG.LIMITS.MAX_CONTENT_LENGTH_BYTES}b` }));
app.use(express.urlencoded({ extended: true, limit: `${CONFIG.LIMITS.MAX_CONTENT_LENGTH_BYTES}b` }));

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/config', configRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/benchmark', benchmarkRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/events', eventsRoutes);
app.use('/api/ml', mlRouter);

// In production, serve the built React frontend client
const clientDistPath = path.resolve(process.cwd(), '../client/dist');
const altClientDistPath = path.resolve(process.cwd(), 'client/dist');
const resolvedClientDist = path.resolve(
  require('fs').existsSync(clientDistPath) ? clientDistPath : altClientDistPath
);

if (require('fs').existsSync(resolvedClientDist)) {
  console.log(`Serving static client from: ${resolvedClientDist}`);
  app.use(express.static(resolvedClientDist));
  app.get('*', (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(resolvedClientDist, 'index.html'));
  });
} else {
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      message: 'Prompt-Injection Firewall API Server',
      status: 'online',
      endpoints: [
        'POST /api/scan',
        'POST /api/agent/run',
        'POST /api/benchmark/run',
        'GET /api/benchmark/latest',
        'GET /api/cases',
        'GET /api/events',
        'GET /api/config',
        'GET /api/health',
      ],
    });
  });
}

// Global Structured Error Handling
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  const reqId = req.headers['x-request-id'] || 'unknown';

  if (err instanceof ZodError) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
      requestId: reqId,
    });
  }

  console.error(`[Error] Request ${reqId}:`, err);
  const status = err.status || err.statusCode || 500;
  return res.status(status).json({
    success: false,
    error: err.message || 'Internal server error occurred',
    requestId: reqId,
  });
});

if (process.env.NODE_ENV !== 'test') {
  app.listen(CONFIG.PORT, () => {
    console.log(`====================================================`);
    console.log(`  Prompt-Injection Firewall Server running on port ${CONFIG.PORT}`);
    console.log(`  Environment: ${CONFIG.NODE_ENV}`);
    console.log(`  LLM Provider: ${CONFIG.GEMINI_API_KEY ? 'Gemini 1.5 Flash' : 'Local Extractive (Offline)'}`);
    console.log(`====================================================`);
  });
}

export default app;
