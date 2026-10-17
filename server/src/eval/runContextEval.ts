import fs from 'fs';
import path from 'path';
import { runFirewall } from '../firewall/index.js';

interface ContextTestCase {
  id: string;
  task: string;
  content: string;
  expectedLabel: 'MALICIOUS' | 'SAFE';
  expectedCategories: string[];
  contextType: string;
  expectedRiskBand: string;
  rationale: string;
}

interface CaseEvalResult {
  id: string;
  content: string;
  contextType: string;
  expectedLabel: 'MALICIOUS' | 'SAFE';
  predictedVerdict: string;
  predictedScore: number;
  detectedCategories: string[];
  isCorrect: boolean;
  isFalsePositive: boolean;
  isFalseNegative: boolean;
  rationale: string;
}

export async function runContextEvaluation() {
  const datasetPath = path.resolve(process.cwd(), '../data/comprehensive_context_dataset.json');
  if (!fs.existsSync(datasetPath)) {
    throw new Error(`Dataset not found at ${datasetPath}`);
  }

  const cases: ContextTestCase[] = JSON.parse(fs.readFileSync(datasetPath, 'utf8'));
  console.log(`\n===============================================================`);
  console.log(`   CONTEXT-AWARE HARMFUL CONTENT BENCHMARK EVALUATION`);
  console.log(`===============================================================\n`);
  console.log(`Loaded ${cases.length} labeled evaluation cases from: ${datasetPath}\n`);

  const results: CaseEvalResult[] = [];
  let tp = 0;
  let fp = 0;
  let tn = 0;
  let fn = 0;

  // Category tracking
  const categoryStats: Record<string, { tp: number; fp: number; fn: number; totalExpected: number }> = {};

  const startTime = Date.now();

  for (const tc of cases) {
    const scanResult = await runFirewall(tc.task, tc.content, 'rules');
    const isFlagged = scanResult.verdict === 'MALICIOUS' || scanResult.verdict === 'SUSPICIOUS';
    const isAttack = tc.expectedLabel === 'MALICIOUS';

    const isCorrect = (isAttack && isFlagged) || (!isAttack && !isFlagged);
    const isFalsePositive = !isAttack && isFlagged;
    const isFalseNegative = isAttack && !isFlagged;

    if (isAttack && isFlagged) tp++;
    if (!isAttack && !isFlagged) tn++;
    if (!isAttack && isFlagged) fp++;
    if (isAttack && !isFlagged) fn++;

    const detectedCats = scanResult.findings.map(f => f.category);

    // Track per-category metrics
    for (const expCat of tc.expectedCategories) {
      if (!categoryStats[expCat]) {
        categoryStats[expCat] = { tp: 0, fp: 0, fn: 0, totalExpected: 0 };
      }
      categoryStats[expCat].totalExpected++;
      if (detectedCats.includes(expCat as any)) {
        categoryStats[expCat].tp++;
      } else {
        categoryStats[expCat].fn++;
      }
    }

    results.push({
      id: tc.id,
      content: tc.content,
      contextType: tc.contextType,
      expectedLabel: tc.expectedLabel,
      predictedVerdict: scanResult.verdict,
      predictedScore: scanResult.riskScore,
      detectedCategories: detectedCats,
      isCorrect,
      isFalsePositive,
      isFalseNegative,
      rationale: tc.rationale,
    });
  }

  const durationMs = Date.now() - startTime;
  const total = cases.length;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 1;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 1;
  const accuracy = (tp + tn) / total;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;

  console.log(`--- EVALUATION RESULTS ---`);
  console.log(`Total Cases Evaluated: ${total}`);
  console.log(`True Positives (TP):   ${tp}`);
  console.log(`True Negatives (TN):   ${tn}`);
  console.log(`False Positives (FP):  ${fp}`);
  console.log(`False Negatives (FN):  ${fn}`);
  console.log(`--------------------------`);
  console.log(`Accuracy:              ${(accuracy * 100).toFixed(1)}%`);
  console.log(`Precision:             ${(precision * 100).toFixed(1)}%`);
  console.log(`Recall:                ${(recall * 100).toFixed(1)}%`);
  console.log(`F1 Score:              ${f1.toFixed(3)}`);
  console.log(`Avg Scan Latency:      ${(durationMs / total).toFixed(2)} ms/case\n`);

  console.log(`--- CONFUSION MATRIX ---`);
  console.log(`                 Predicted MALICIOUS   Predicted SAFE`);
  console.log(`Actual MALICIOUS        ${tp.toString().padEnd(10)}          ${fn.toString().padEnd(10)}`);
  console.log(`Actual SAFE             ${fp.toString().padEnd(10)}          ${tn.toString().padEnd(10)}\n`);

  console.log(`--- PER-CATEGORY METRICS ---`);
  for (const [cat, stats] of Object.entries(categoryStats)) {
    const catRecall = stats.totalExpected > 0 ? (stats.tp / stats.totalExpected) : 1;
    console.log(`  ${cat.padEnd(35)}: ${stats.tp}/${stats.totalExpected} detected (${(catRecall * 100).toFixed(0)}% recall)`);
  }
  console.log(`\n`);

  // Save report
  const outputDir = path.resolve(process.cwd(), '../data/results');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const reportJsonPath = path.join(outputDir, 'context_eval_report.json');
  fs.writeFileSync(
    reportJsonPath,
    JSON.stringify(
      {
        total,
        tp,
        tn,
        fp,
        fn,
        accuracy,
        precision,
        recall,
        f1,
        durationMs,
        categoryStats,
        results,
      },
      null,
      2
    )
  );

  let mdReport = `# Context-Aware Threat Detection: Evaluation Report\n\n`;
  mdReport += `Generated on: ${new Date().toISOString()}\n\n`;
  mdReport += `## Summary Metrics\n\n`;
  mdReport += `| Metric | Value |\n|---|---|\n`;
  mdReport += `| Total Labeled Cases | **${total}** |\n`;
  mdReport += `| Accuracy | **${(accuracy * 100).toFixed(1)}%** |\n`;
  mdReport += `| Precision | **${(precision * 100).toFixed(1)}%** |\n`;
  mdReport += `| Recall | **${(recall * 100).toFixed(1)}%** |\n`;
  mdReport += `| F1 Score | **${f1.toFixed(3)}** |\n`;
  mdReport += `| True Positives (TP) | ${tp} |\n`;
  mdReport += `| True Negatives (TN) | ${tn} |\n`;
  mdReport += `| False Positives (FP) | ${fp} |\n`;
  mdReport += `| False Negatives (FN) | ${fn} |\n`;
  mdReport += `| Avg Latency | ${(durationMs / total).toFixed(2)} ms/query |\n\n`;

  mdReport += `## Confusion Matrix\n\n`;
  mdReport += `| | Predicted Harmful / Malicious | Predicted Safe |\n`;
  mdReport += `|---|---|---|\n`;
  mdReport += `| **Actual Harmful** | **${tp} (TP)** | ${fn} (FN) |\n`;
  mdReport += `| **Actual Safe** | ${fp} (FP) | **${tn} (TN)** |\n\n`;

  mdReport += `## Per-Category Performance\n\n`;
  mdReport += `| Category | Detected / Expected | Recall |\n|---|---|---|\n`;
  for (const [cat, stats] of Object.entries(categoryStats)) {
    const catRecall = stats.totalExpected > 0 ? (stats.tp / stats.totalExpected) : 1;
    mdReport += `| \`${cat}\` | ${stats.tp} / ${stats.totalExpected} | ${(catRecall * 100).toFixed(0)}% |\n`;
  }

  const reportMdPath = path.join(outputDir, 'context_eval_report.md');
  fs.writeFileSync(reportMdPath, mdReport);
  console.log(`Saved evaluation JSON to: ${reportJsonPath}`);
  console.log(`Saved evaluation Markdown to: ${reportMdPath}\n`);
}

runContextEvaluation().catch((err) => {
  console.error('Context evaluation error:', err);
  process.exit(1);
});
