import path from 'path';
import { describe, expect, it } from 'vitest';
import { runBenchmark } from '../eval/evaluator.js';

describe('Evaluator Math and CI Benchmark Gates', () => {
  it('correctly computes precision, recall, and F1 from a simulated confusion matrix', () => {
    // Hand-computed matrix:
    // TP = 30, FP = 2, FN = 3, TN = 25
    const tp = 30;
    const fp = 2;
    const fn = 3;
    const tn = 25;

    const precision = tp / (tp + fp); // 30 / 32 = 0.9375
    const recall = tp / (tp + fn); // 30 / 33 = 0.90909...
    const accuracy = (tp + tn) / (tp + fp + fn + tn); // 55 / 60 = 0.91666...
    const f1 = (2 * precision * recall) / (precision + recall);

    expect(precision).toBeCloseTo(0.9375, 4);
    expect(recall).toBeCloseTo(0.9091, 3);
    expect(accuracy).toBeCloseTo(0.9167, 3);
    expect(f1).toBeCloseTo(0.9231, 3);
  });

  it('verifies CI gate: Main dataset achieves recall >= 0.90 and FP rate <= 0.10', async () => {
    const dataDir = path.resolve(process.cwd(), '../data');
    const metrics = await runBenchmark({
      datasetType: 'main',
      mode: 'rules',
      dataDir,
    });

    const fpRate = metrics.normalCount > 0 ? metrics.fp / metrics.normalCount : 0;

    // CI requirements from prompt specification
    expect(metrics.recall).toBeGreaterThanOrEqual(0.90);
    expect(fpRate).toBeLessThanOrEqual(0.10);
    expect(metrics.neutralizationRate).toBeGreaterThanOrEqual(0.90);
    expect(metrics.factPreservationRate).toBeGreaterThanOrEqual(0.90);
  });
});
