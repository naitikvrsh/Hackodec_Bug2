import path from 'path';
import { runBenchmark, saveBenchmarkResults } from './evaluator.js';
import { getDataDir } from '../config.js';

async function main() {
  console.log('===============================================================');
  console.log('   PROMPT-INJECTION FIREWALL: EMPIRICAL BENCHMARK EVALUATION   ');
  console.log('===============================================================\n');

  const rootDataDir = getDataDir();
  const resultsDir = path.resolve(rootDataDir, 'results');

  // 1. Evaluate Main Dataset
  console.log('>>> Evaluating Main Dataset (/data/attacks.json + /data/normal.json)...');
  const mainMetrics = await runBenchmark({
    datasetType: 'main',
    mode: 'rules',
    dataDir: rootDataDir,
  });

  console.log('\n--- MAIN DATASET RESULTS ---');
  console.log(`Total Cases:           ${mainMetrics.total} (${mainMetrics.attacksCount} Attacks, ${mainMetrics.normalCount} Benign)`);
  console.log(`Recall (Detection):    ${(mainMetrics.recall * 100).toFixed(1)}% (TP: ${mainMetrics.tp}, FN: ${mainMetrics.fn})`);
  console.log(`Precision:             ${(mainMetrics.precision * 100).toFixed(1)}% (FP: ${mainMetrics.fp}, TN: ${mainMetrics.tn})`);
  console.log(`Accuracy:              ${(mainMetrics.accuracy * 100).toFixed(1)}%`);
  console.log(`F1 Score:              ${mainMetrics.f1.toFixed(3)}`);
  console.log(`Neutralization Rate:   ${(mainMetrics.neutralizationRate * 100).toFixed(1)}%`);
  console.log(`Fact Preservation:     ${(mainMetrics.factPreservationRate * 100).toFixed(1)}%`);
  console.log(`Avg Scan Latency:      ${mainMetrics.averageTimingMs.toFixed(2)} ms`);

  // 2. Evaluate Held-Out Dataset
  console.log('\n>>> Evaluating Held-Out Dataset (/data/holdout.json)...');
  const holdoutMetrics = await runBenchmark({
    datasetType: 'holdout',
    mode: 'rules',
    dataDir: rootDataDir,
  });

  console.log('\n--- HELD-OUT DATASET RESULTS ---');
  console.log(`Total Cases:           ${holdoutMetrics.total} (${holdoutMetrics.attacksCount} Attacks, ${holdoutMetrics.normalCount} Benign)`);
  console.log(`Recall (Detection):    ${(holdoutMetrics.recall * 100).toFixed(1)}% (TP: ${holdoutMetrics.tp}, FN: ${holdoutMetrics.fn})`);
  console.log(`Precision:             ${(holdoutMetrics.precision * 100).toFixed(1)}% (FP: ${holdoutMetrics.fp}, TN: ${holdoutMetrics.tn})`);
  console.log(`Accuracy:              ${(holdoutMetrics.accuracy * 100).toFixed(1)}%`);
  console.log(`F1 Score:              ${holdoutMetrics.f1.toFixed(3)}`);
  console.log(`Neutralization Rate:   ${(holdoutMetrics.neutralizationRate * 100).toFixed(1)}%`);
  console.log(`Fact Preservation:     ${(holdoutMetrics.factPreservationRate * 100).toFixed(1)}%`);
  console.log(`Avg Scan Latency:      ${holdoutMetrics.averageTimingMs.toFixed(2)} ms`);

  // 3. Combined Run & Persistence
  console.log('\n>>> Saving latest unified benchmark results...');
  const unifiedMetrics = await runBenchmark({
    datasetType: 'all',
    mode: 'rules',
    dataDir: rootDataDir,
  });

  const { jsonPath, mdPath } = saveBenchmarkResults(unifiedMetrics, resultsDir);
  console.log(`Saved benchmark JSON to: ${jsonPath}`);
  console.log(`Saved benchmark Markdown to: ${mdPath}`);
  console.log('\nEvaluation completed successfully!\n');
}

main().catch((err) => {
  console.error('Benchmark evaluation failed:', err);
  process.exit(1);
});
