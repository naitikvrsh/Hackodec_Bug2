import fs from 'fs';
import path from 'path';
import { getModelsDir } from '../config.js';

export interface MLPrediction {
  label: 'MALICIOUS' | 'BENIGN' | 'NEEDS_REVIEW';
  category: string;
  confidence: number;
  isCalibrated: boolean;
  probabilities: {
    MALICIOUS: number;
    BENIGN: number;
    NEEDS_REVIEW: number;
  };
  latencyMs: number;
  explanation: string;
  modelVersion: string;
  modelStatus: 'ready' | 'missing' | 'error';
}

interface ModelWeightsPayload {
  version: string;
  trained_timestamp: string;
  uncertainty_threshold: number;
  primary_classes: string[];
  category_classes: string[];
  idf: Record<string, number>;
  primary_bias: Record<string, number>;
  primary_weights: Record<string, Record<string, number>>;
  category_bias: Record<string, number>;
  category_weights: Record<string, Record<string, number>>;
  metrics?: any;
}

export class MLSemanticClassifier {
  private static instance: MLSemanticClassifier;
  private modelWeights: ModelWeightsPayload | null = null;
  private modelDir: string;
  private lastLoadedTime: number = 0;

  private constructor() {
    this.modelDir = path.join(getModelsDir(), 'aegisguard-classifier');
    this.reloadModel();
  }

  public static getInstance(): MLSemanticClassifier {
    if (!MLSemanticClassifier.instance) {
      MLSemanticClassifier.instance = new MLSemanticClassifier();
    }
    return MLSemanticClassifier.instance;
  }

  public reloadModel(): boolean {
    const weightsFile = path.join(this.modelDir, 'model_weights.json');
    if (fs.existsSync(weightsFile)) {
      try {
        const raw = fs.readFileSync(weightsFile, 'utf8');
        this.modelWeights = JSON.parse(raw);
        this.lastLoadedTime = Date.now();
        console.log(`[AEGISGUARD ML] Loaded trained semantic model v${this.modelWeights?.version} (${Object.keys(this.modelWeights?.idf || {}).length} features)`);
        return true;
      } catch (err) {
        console.error(`[AEGISGUARD ML] Error loading model weights from ${weightsFile}:`, err);
        this.modelWeights = null;
        return false;
      }
    } else {
      console.warn(`[AEGISGUARD ML] No model weights found at ${weightsFile}. Run 'python -m training.train' to build.`);
      this.modelWeights = null;
      return false;
    }
  }

  public isReady(): boolean {
    return this.modelWeights !== null;
  }

  public getModelMetadata(): Record<string, any> {
    const metaFile = path.join(this.modelDir, 'model_meta.json');
    if (fs.existsSync(metaFile)) {
      try {
        return JSON.parse(fs.readFileSync(metaFile, 'utf8'));
      } catch (e) {
        // ignore
      }
    }
    return {
      status: this.modelWeights ? 'ready' : 'missing',
      version: this.modelWeights?.version || '1.0.0',
      last_trained: this.modelWeights?.trained_timestamp || null,
      features_count: Object.keys(this.modelWeights?.idf || {}).length,
    };
  }

  private normalize(text: string): string {
    return text.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  private extractWordNgrams(text: string, nRange: [number, number] = [1, 3]): string[] {
    const matches = text.match(/\b[\w'-]+\b/g) || [];
    const ngrams: string[] = [];
    for (let n = nRange[0]; n <= nRange[1]; n++) {
      for (let i = 0; i <= matches.length - n; i++) {
        ngrams.push('w:' + matches.slice(i, i + n).join(' '));
      }
    }
    return ngrams;
  }

  private extractCharNgrams(text: string, nRange: [number, number] = [3, 5]): string[] {
    const cleaned = text.replace(/[^a-z0-9 ]/g, '');
    const ngrams: string[] = [];
    for (let n = nRange[0]; n <= nRange[1]; n++) {
      for (let i = 0; i <= cleaned.length - n; i++) {
        ngrams.push('c:' + cleaned.substring(i, i + n));
      }
    }
    return ngrams;
  }

  private extractFeatures(text: string): Record<string, number> {
    if (!this.modelWeights) return {};
    const norm = this.normalize(text);
    const wordTokens = this.extractWordNgrams(norm);
    const charTokens = this.extractCharNgrams(norm);

    const featureVector: Record<string, number> = {};
    let normSq = 0.0;

    // Word counts
    const wordCounts: Record<string, number> = {};
    for (const t of wordTokens) wordCounts[t] = (wordCounts[t] || 0) + 1;
    for (const [t, c] of Object.entries(wordCounts)) {
      const idfVal = this.modelWeights.idf[t];
      if (idfVal !== undefined) {
        const weight = 3.0 * (1.0 + Math.log(c)) * idfVal;
        featureVector[t] = weight;
        normSq += weight * weight;
      }
    }

    // Char counts
    const charCounts: Record<string, number> = {};
    for (const t of charTokens) charCounts[t] = (charCounts[t] || 0) + 1;
    for (const [t, c] of Object.entries(charCounts)) {
      const idfVal = this.modelWeights.idf[t];
      if (idfVal !== undefined) {
        const weight = 0.6 * (1.0 + Math.log(c)) * idfVal;
        featureVector[t] = weight;
        normSq += weight * weight;
      }
    }

    // L2 normalize
    if (normSq > 0) {
      const l2 = Math.sqrt(normSq);
      for (const t of Object.keys(featureVector)) {
        featureVector[t] /= l2;
      }
    }

    return featureVector;
  }

  public classify(text: string): MLPrediction {
    const startTime = Date.now();
    const modelVersion = this.modelWeights?.version || '1.0.0';

    // Fail-safe check
    if (!this.modelWeights) {
      return {
        label: 'NEEDS_REVIEW',
        category: 'ambiguous_context',
        confidence: 0.0,
        isCalibrated: false,
        probabilities: { MALICIOUS: 0.33, BENIGN: 0.33, NEEDS_REVIEW: 0.34 },
        latencyMs: Date.now() - startTime,
        explanation: 'ML model weights are uninitialized; routed to review fail-safe.',
        modelVersion,
        modelStatus: 'missing',
      };
    }

    const norm = this.normalize(text);
    const feats = this.extractFeatures(norm);

    if (Object.keys(feats).length === 0 || norm.length === 0) {
      return {
        label: 'NEEDS_REVIEW',
        category: 'ambiguous_context',
        confidence: 0.50,
        isCalibrated: true,
        probabilities: { MALICIOUS: 0.25, BENIGN: 0.25, NEEDS_REVIEW: 0.50 },
        latencyMs: Math.max(1, Date.now() - startTime),
        explanation: 'Input lacks sufficient discriminative semantic features.',
        modelVersion,
        modelStatus: 'ready',
      };
    }

    // Primary Head logits
    const primaryClasses = this.modelWeights.primary_classes || ['MALICIOUS', 'BENIGN', 'NEEDS_REVIEW'];
    const logits: Record<string, number> = {};
    for (const cls of primaryClasses) {
      let logit = this.modelWeights.primary_bias[cls] || 0.0;
      const classWeights = this.modelWeights.primary_weights[cls] || {};
      for (const [feat, val] of Object.entries(feats)) {
        if (classWeights[feat] !== undefined) {
          logit += val * classWeights[feat];
        }
      }
      logits[cls] = logit;
    }

    // Softmax
    const maxLogit = Math.max(...Object.values(logits));
    let sumExp = 0.0;
    const exps: Record<string, number> = {};
    for (const cls of primaryClasses) {
      exps[cls] = Math.exp(logits[cls] - maxLogit);
      sumExp += exps[cls];
    }
    const probs: Record<string, number> = {};
    for (const cls of primaryClasses) {
      probs[cls] = sumExp > 0 ? exps[cls] / sumExp : 0.33;
    }

    // Category Head logits
    const catClasses = this.modelWeights.category_classes || [];
    let bestCat = 'ambiguous_context';
    let maxCatLogit = -Infinity;
    for (const cat of catClasses) {
      let cLogit = this.modelWeights.category_bias[cat] || 0.0;
      const cWeights = this.modelWeights.category_weights[cat] || {};
      for (const [feat, val] of Object.entries(feats)) {
        if (cWeights[feat] !== undefined) {
          cLogit += val * cWeights[feat];
        }
      }
      if (cLogit > maxCatLogit) {
        maxCatLogit = cLogit;
        bestCat = cat;
      }
    }

    // Calibrated Verdict Decision
    const pMal = probs['MALICIOUS'] || 0.0;
    const pBen = probs['BENIGN'] || 0.0;
    const pRev = probs['NEEDS_REVIEW'] || 0.0;
    const margin = Math.abs(pMal - pBen);
    const words = (norm.match(/\b\w+\b/g) || []).length;

    let verdict: 'MALICIOUS' | 'BENIGN' | 'NEEDS_REVIEW';
    let explanation: string;
    let confidence: number;
    const topProb = Math.max(pMal, pBen, pRev);
    const uncertaintyThreshold = this.modelWeights.uncertainty_threshold || 0.62;

    if (words <= 2 && topProb < 0.75) {
      verdict = 'NEEDS_REVIEW';
      confidence = Math.max(pRev, 0.50);
      explanation = 'Input is too brief or ambiguous to reliably determine intent.';
    } else if (topProb < uncertaintyThreshold || (margin < 0.15 && topProb < 0.70)) {
      verdict = 'NEEDS_REVIEW';
      confidence = Math.max(pRev, 0.50);
      explanation = `Confidence (${(topProb * 100).toFixed(1)}%) or margin (${(margin * 100).toFixed(1)}%) below operational certainty threshold; routed to review.`;
    } else if (pRev >= pMal && pRev >= pBen) {
      verdict = 'NEEDS_REVIEW';
      confidence = pRev;
      explanation = `Classified as ambiguous/needs review (${bestCat}) with ${(confidence * 100).toFixed(1)}% confidence.`;
    } else {
      verdict = pMal >= pBen ? 'MALICIOUS' : 'BENIGN';
      confidence = verdict === 'MALICIOUS' ? pMal : pBen;
      if (verdict === 'MALICIOUS') {
        explanation = `Semantic threat detected in category '${bestCat}' with ${(confidence * 100).toFixed(1)}% calibrated confidence.`;
      } else {
        explanation = `Classified as legitimate (${bestCat}) with ${(confidence * 100).toFixed(1)}% calibrated confidence.`;
      }
    }

    return {
      label: verdict,
      category: bestCat,
      confidence: Math.round(confidence * 1000) / 1000,
      isCalibrated: true,
      probabilities: {
        MALICIOUS: Math.round(pMal * 1000) / 1000,
        BENIGN: Math.round(pBen * 1000) / 1000,
        NEEDS_REVIEW: Math.round(pRev * 1000) / 1000,
      },
      latencyMs: Math.max(1, Date.now() - startTime),
      explanation,
      modelVersion,
      modelStatus: 'ready',
    };
  }
}
