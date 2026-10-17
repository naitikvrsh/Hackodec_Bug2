import fs from 'fs';
import path from 'path';
import { Router } from 'express';
import { z } from 'zod';
import { runBenchmark, saveBenchmarkResults } from '../eval/evaluator.js';

const router = Router();

const BenchmarkRunSchema = z.object({
  dataset: z.enum(['main', 'holdout', 'all']).default('main'),
  mode: z.enum(['rules', 'hybrid']).default('rules'),
});

router.post('/run', async (req, res, next) => {
  try {
    const { dataset, mode } = BenchmarkRunSchema.parse(req.body);

    const rootDataDir = path.resolve(process.cwd(), '../data');
    const resultsDir = path.resolve(rootDataDir, 'results');

    const metrics = await runBenchmark({
      datasetType: dataset,
      mode,
      dataDir: rootDataDir,
    });

    saveBenchmarkResults(metrics, resultsDir);

    return res.json({
      success: true,
      metrics,
    });
  } catch (err) {
    next(err);
  }
});

router.get('/latest', (req, res) => {
  const rootDataDir = path.resolve(process.cwd(), '../data');
  const latestJsonPath = path.resolve(rootDataDir, 'results', 'latest.json');

  if (fs.existsSync(latestJsonPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(latestJsonPath, 'utf8'));
      return res.json({ success: true, metrics: data });
    } catch {
      // Ignored
    }
  }

  return res.status(404).json({
    success: false,
    message: 'No benchmark results found yet. Run a benchmark from the Benchmark Lab to generate initial metrics.',
  });
});

export default router;
