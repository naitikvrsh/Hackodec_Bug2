import fs from 'fs';
import path from 'path';
import { runFirewall } from '../firewall/index.js';
import {
  BenchmarkCase,
  BenchmarkMetrics,
  CaseResult,
  DetectionMode,
} from '../types/index.js';

export interface EvaluatorOptions {
  datasetType?: 'main' | 'holdout' | 'all';
  mode?: DetectionMode;
  dataDir?: string;
}

/**
 * Loads dataset cases based on specified datasetType.
 */
export function loadCases(dataDir: string, datasetType: 'main' | 'holdout' | 'all'): BenchmarkCase[] {
  const attacksPath = path.join(dataDir, 'attacks.json');
  const normalPath = path.join(dataDir, 'normal.json');
  const holdoutPath = path.join(dataDir, 'holdout.json');

  let cases: BenchmarkCase[] = [];

  if (datasetType === 'main' || datasetType === 'all') {
    if (fs.existsSync(attacksPath)) {
      const attacks = JSON.parse(fs.readFileSync(attacksPath, 'utf8'));
      cases.push(...attacks);
    }
    if (fs.existsSync(normalPath)) {
      const normal = JSON.parse(fs.readFileSync(normalPath, 'utf8'));
      cases.push(...normal);
    }
  }

  if (datasetType === 'holdout' || datasetType === 'all') {
    if (fs.existsSync(holdoutPath)) {
      const holdout = JSON.parse(fs.readFileSync(holdoutPath, 'utf8'));
      cases.push(...holdout);
    }
  }

  return cases;
}

/**
 * Evaluates a single case against the firewall engine.
 */
export async function evaluateSingleCase(
  benchmarkCase: BenchmarkCase,
  mode: DetectionMode = 'rules'
): Promise<CaseResult> {
  const startTime = Date.now();
  const scanResult = await runFirewall(benchmarkCase.task, benchmarkCase.content, mode);
  const timingMs = Date.now() - startTime;

  // Standard Definition: Flagged = SUSPICIOUS or MALICIOUS or ERROR_BLOCKED
  const isFlagged =
    scanResult.verdict === 'MALICIOUS' ||
    scanResult.verdict === 'SUSPICIOUS' ||
    scanResult.verdict === 'ERROR_BLOCKED';

  const isAttack = benchmarkCase.label === 'MALICIOUS';
  const isCorrect = (isAttack && isFlagged) || (!isAttack && !isFlagged);
  const isFalsePositive = !isAttack && isFlagged;
  const isFalseNegative = isAttack && !isFlagged;

  // Attack cases: check neutralization rate (does sanitized output still contain active injection spans?)
  let neutralizationSuccess: boolean | undefined = undefined;
  if (isAttack) {
    let unneutralized = false;
    for (const finding of scanResult.findings) {
      if (
        finding.severity >= 50 &&
        finding.evidenceText &&
        finding.evidenceText.length > 5 &&
        scanResult.sanitizedText.includes(finding.evidenceText)
      ) {
        unneutralized = true;
        break;
      }
    }
    neutralizationSuccess = !unneutralized;
  }

  // Normal cases: check fact preservation rate (are expectedFacts retained?)
  let factPreservationScore: number | undefined = undefined;
  if (!isAttack && benchmarkCase.expectedFacts && benchmarkCase.expectedFacts.length > 0) {
    let preservedCount = 0;
    for (const fact of benchmarkCase.expectedFacts) {
      if (scanResult.sanitizedText.toLowerCase().includes(fact.toLowerCase())) {
        preservedCount++;
      }
    }
    factPreservationScore = preservedCount / benchmarkCase.expectedFacts.length;
  } else if (!isAttack) {
    factPreservationScore = 1.0;
  }

  return {
    id: benchmarkCase.id,
    task: benchmarkCase.task,
    label: benchmarkCase.label,
    category: benchmarkCase.category,
    predictedVerdict: scanResult.verdict,
    predictedScore: scanResult.riskScore,
    isCorrect,
    isFalsePositive,
    isFalseNegative,
    neutralizationSuccess,
    factPreservationScore,
    timingMs,
    findingsCount: scanResult.findings.length,
    contentSnippet: benchmarkCase.content.slice(0, 100),
    notes: benchmarkCase.notes,
  };
}

/**
 * Runs evaluation across an entire dataset and calculates complete metrics.
 */
export async function runBenchmark(options: EvaluatorOptions = {}): Promise<BenchmarkMetrics> {
  const { datasetType = 'main', mode = 'rules', dataDir = path.resolve(process.cwd(), '../data') } = options;

  // Resolve directory to where data folder actually resides
  let resolvedDataDir = dataDir;
  if (!fs.existsSync(resolvedDataDir)) {
    resolvedDataDir = path.resolve(process.cwd(), 'data');
  }

  const cases = loadCases(resolvedDataDir, datasetType);
  if (cases.length === 0) {
    throw new Error(`No benchmark cases found in directory: ${resolvedDataDir} for split: ${datasetType}`);
  }

  const caseResults: CaseResult[] = [];
  let totalTiming = 0;

  for (const c of cases) {
    const res = await evaluateSingleCase(c, mode);
    caseResults.push(res);
    totalTiming += res.timingMs;
  }

  // Compute Standard Confusion Matrix (Positive = SUSPICIOUS or MALICIOUS)
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;
  let attacksCount = 0;
  let normalCount = 0;

  // Strict Confusion Matrix (Positive = MALICIOUS only)
  let strictTp = 0;
  let strictFp = 0;
  let strictTn = 0;
  let strictFn = 0;

  // Neutralization and fact preservation tracking
  let neutralizedAttacks = 0;
  let totalFactPreservationScore = 0;
  let normalFactCasesCount = 0;

  // Category tracking
  const perCategory: Record<string, { total: number; detected: number; recall: number }> = {};

  for (const res of caseResults) {
    const isAttack = res.label === 'MALICIOUS';
    const isFlagged = res.predictedVerdict === 'MALICIOUS' || res.predictedVerdict === 'SUSPICIOUS' || res.predictedVerdict === 'ERROR_BLOCKED';
    const isStrictFlagged = res.predictedVerdict === 'MALICIOUS' || res.predictedVerdict === 'ERROR_BLOCKED';

    if (isAttack) {
      attacksCount++;
      if (isFlagged) tp++; else fn++;
      if (isStrictFlagged) strictTp++; else strictFn++;

      if (res.neutralizationSuccess) neutralizedAttacks++;

      // Per-category metrics
      if (!perCategory[res.category]) {
        perCategory[res.category] = { total: 0, detected: 0, recall: 0 };
      }
      perCategory[res.category].total++;
      if (isFlagged) perCategory[res.category].detected++;
    } else {
      normalCount++;
      if (isFlagged) fp++; else tn++;
      if (isStrictFlagged) strictFp++; else strictTn++;

      if (res.factPreservationScore !== undefined) {
        totalFactPreservationScore += res.factPreservationScore;
        normalFactCasesCount++;
      }
    }
  }

  // Compute per-category recall rates
  for (const cat of Object.keys(perCategory)) {
    const entry = perCategory[cat];
    entry.recall = entry.total > 0 ? entry.detected / entry.total : 0;
  }

  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const accuracy = caseResults.length > 0 ? (tp + tn) / caseResults.length : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  const strictPrecision = strictTp + strictFp > 0 ? strictTp / (strictTp + strictFp) : 0;
  const strictRecall = strictTp + strictFn > 0 ? strictTp / (strictTp + strictFn) : 0;
  const strictF1 = strictPrecision + strictRecall > 0 ? (2 * strictPrecision * strictRecall) / (strictPrecision + strictRecall) : 0;

  const neutralizationRate = attacksCount > 0 ? neutralizedAttacks / attacksCount : 1.0;
  const factPreservationRate = normalFactCasesCount > 0 ? totalFactPreservationScore / normalFactCasesCount : 1.0;

  const metrics: BenchmarkMetrics = {
    total: caseResults.length,
    attacksCount,
    normalCount,
    tp,
    fp,
    tn,
    fn,
    precision,
    recall,
    accuracy,
    f1,
    neutralizationRate,
    factPreservationRate,
    strictMetrics: {
      tp: strictTp,
      fp: strictFp,
      tn: strictTn,
      fn: strictFn,
      precision: strictPrecision,
      recall: strictRecall,
      f1: strictF1,
    },
    perCategoryRecall: perCategory,
    averageTimingMs: caseResults.length > 0 ? totalTiming / caseResults.length : 0,
    timestamp: new Date().toISOString(),
    results: caseResults,
  };

  return metrics;
}

/**
 * Saves benchmark metrics to JSON and Markdown reports.
 */
export function saveBenchmarkResults(metrics: BenchmarkMetrics, outputDir: string): { jsonPath: string; mdPath: string } {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const jsonPath = path.join(outputDir, 'latest.json');
  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2), 'utf8');

  const mdPath = path.join(outputDir, 'benchmark_report.md');
  const mdContent = `# Prompt-Injection Firewall Benchmark Report
Generated at: **${metrics.timestamp}**

## Summary Metrics
- **Total Test Cases**: ${metrics.total} (${metrics.attacksCount} Attacks, ${metrics.normalCount} Benign)
- **Standard Recall (Detection Rate)**: **${(metrics.recall * 100).toFixed(1)}%** (TP: ${metrics.tp}, FN: ${metrics.fn})
- **Standard Precision**: **${(metrics.precision * 100).toFixed(1)}%** (FP: ${metrics.fp})
- **Accuracy**: **${(metrics.accuracy * 100).toFixed(1)}%**
- **F1 Score**: **${metrics.f1.toFixed(3)}**
- **Neutralization Rate**: **${(metrics.neutralizationRate * 100).toFixed(1)}%**
- **Fact Preservation Rate**: **${(metrics.factPreservationRate * 100).toFixed(1)}%**
- **Average Scan Latency**: **${metrics.averageTimingMs.toFixed(2)} ms**

### Confusion Matrix (Standard: Flagged = SUSPICIOUS | MALICIOUS)
| | Predicted Attack (Flagged) | Predicted Normal (Safe) |
|---|---|---|
| **Actual Attack** | **${metrics.tp}** (TP) | **${metrics.fn}** (FN) |
| **Actual Normal** | **${metrics.fp}** (FP) | **${metrics.tn}** (TN) |

### Strict Mode (Flagged = MALICIOUS only)
- **Strict Recall**: ${(metrics.strictMetrics.recall * 100).toFixed(1)}%
- **Strict Precision**: ${(metrics.strictMetrics.precision * 100).toFixed(1)}%
- **Strict F1**: ${metrics.strictMetrics.f1.toFixed(3)}

## Per-Category Recall
| Category | Total Cases | Detected | Recall Rate |
|---|---|---|---|
${Object.entries(metrics.perCategoryRecall)
  .map(([cat, val]) => `| \`${cat}\` | ${val.total} | ${val.detected} | ${(val.recall * 100).toFixed(1)}% |`)
  .join('\n')}

## Failures & Discrepancies
${
  metrics.fp === 0 && metrics.fn === 0
    ? '✅ Zero false positives and zero false negatives recorded on this evaluation run!'
    : metrics.results
        .filter((r) => r.isFalsePositive || r.isFalseNegative)
        .map(
          (r) =>
            `- **[${r.id}]** Actual: ${r.label}, Predicted: ${r.predictedVerdict} (${r.predictedScore}/100)\n  Task: "${r.task}"\n  Snippet: "${r.contentSnippet}"\n  Notes: ${r.notes || 'N/A'}`
        )
        .join('\n\n')
}
`;

  fs.writeFileSync(mdPath, mdContent, 'utf8');

  return { jsonPath, mdPath };
}
