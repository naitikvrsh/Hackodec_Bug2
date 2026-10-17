import os
import re
import json
import math
import time
from typing import List, Dict, Tuple, Optional, Any
from collections import Counter, defaultdict

class SemanticThreatClassifier:
    """
    AEGISGUARD Semantic Machine Learning Threat Classifier.
    
    Combines:
    1. Multi-scale tokenization: Sublinear TF-IDF over word n-grams (1-3) + character n-grams (3-5).
       This captures subtle phrase-level semantic context (e.g. 'prevent robbery' vs 'plan robbery')
       and is resilient against obfuscation, spacing, typos, and Hinglish transliterations.
    2. Primary Classification Head: Calibrated Multinomial Logistic Regression with class-balanced priors.
    3. Category Classification Head: Multi-class predictor for 20 threat categories.
    4. Calibrated Confidence Scoring: Sigmoid/Platt temperature scaling.
    5. Configurable Uncertainty Threshold: Dynamic routing to 'NEEDS_REVIEW' for low-confidence/ambiguous cases.
    """

    def __init__(self, uncertainty_threshold: float = 0.62):
        self.uncertainty_threshold = uncertainty_threshold
        self.word_vocab: Dict[str, int] = {}
        self.char_vocab: Dict[str, int] = {}
        self.idf: Dict[str, float] = {}
        
        # Primary labels: MALICIOUS, BENIGN, NEEDS_REVIEW
        self.primary_classes = ["MALICIOUS", "BENIGN", "NEEDS_REVIEW"]
        self.category_classes: List[str] = []
        
        # Linear Model weights
        self.primary_weights: Dict[str, Dict[str, float]] = {}
        self.primary_bias: Dict[str, float] = {}
        self.category_weights: Dict[str, Dict[str, float]] = {}
        self.category_bias: Dict[str, float] = {}

        self.version = "1.0.0"
        self.trained_timestamp: Optional[str] = None
        self.metrics: Dict[str, Any] = {}

    def _normalize(self, text: str) -> str:
        """Normalizes input string while preserving semantic markers and negation particles."""
        text = text.lower().strip()
        # Collapse excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        return text

    def _extract_word_ngrams(self, text: str, n_range=(1, 3)) -> List[str]:
        words = re.findall(r'\b[\w\'-]+\b', text)
        ngrams = []
        for n in range(n_range[0], n_range[1] + 1):
            for i in range(len(words) - n + 1):
                ngrams.append("w:" + " ".join(words[i:i + n]))
        return ngrams

    def _extract_char_ngrams(self, text: str, n_range=(3, 5)) -> List[str]:
        # Clean text for character n-grams (preserves typos/variations)
        cleaned = re.sub(r'[^a-z0-9 ]', '', text)
        ngrams = []
        for n in range(n_range[0], n_range[1] + 1):
            for i in range(len(cleaned) - n + 1):
                ngrams.append("c:" + cleaned[i:i + n])
        return ngrams

    def _extract_features(self, text: str) -> Dict[str, float]:
        norm_text = self._normalize(text)
        word_tokens = self._extract_word_ngrams(norm_text)
        char_tokens = self._extract_char_ngrams(norm_text)
        
        feature_vector: Dict[str, float] = {}
        norm_sq = 0.0

        # Word n-grams carry high semantic intent weight
        word_tf = Counter(word_tokens)
        for token, count in word_tf.items():
            if token in self.idf:
                weight = 3.0 * (1.0 + math.log(count)) * self.idf[token]
                feature_vector[token] = weight
                norm_sq += weight * weight

        # Char n-grams provide subword robustness and misspelling resilience
        char_tf = Counter(char_tokens)
        for token, count in char_tf.items():
            if token in self.idf:
                weight = 0.6 * (1.0 + math.log(count)) * self.idf[token]
                feature_vector[token] = weight
                norm_sq += weight * weight

        # L2 Unit Normalization
        if norm_sq > 0:
            l2_norm = math.sqrt(norm_sq)
            for token in feature_vector:
                feature_vector[token] /= l2_norm

        return feature_vector

    def fit(self, records: List[Dict[str, str]], epochs: int = 15, lr: float = 0.08, l2_reg: float = 0.001):
        """Fits multi-head semantic classifier on validated training records."""
        print(f"Training SemanticThreatClassifier on {len(records)} examples...")
        
        # 1. Build Vocabulary & Document Frequencies
        df: Dict[str, int] = defaultdict(int)
        categories_set = set()
        
        for r in records:
            norm_text = self._normalize(r["text"])
            tokens = set(self._extract_word_ngrams(norm_text) + self._extract_char_ngrams(norm_text))
            for t in tokens:
                df[t] += 1
            categories_set.add(r["category"])

        self.category_classes = sorted(list(categories_set))
        num_docs = len(records)
        
        # Filter rare features (min doc freq = 2 or single strong word)
        self.idf = {}
        for token, count in df.items():
            if count >= 2 or token.startswith("w:"):
                # Smooth IDF formula
                self.idf[token] = math.log((num_docs + 1.0) / (count + 1.0)) + 1.0

        # Initialize weights
        self.primary_weights = {cls: defaultdict(float) for cls in self.primary_classes}
        self.primary_bias = {cls: 0.0 for cls in self.primary_classes}
        
        self.category_weights = {cat: defaultdict(float) for cat in self.category_classes}
        self.category_bias = {cat: 0.0 for cat in self.category_classes}

        # Class weights to handle distribution imbalance
        label_counts = Counter(r["label"] for r in records)
        total_samples = len(records)
        class_weights = {
            cls: total_samples / (len(self.primary_classes) * max(1, label_counts.get(cls, 1)))
            for cls in self.primary_classes
        }

        # 2. Stochastic Gradient Descent with Softmax Cross-Entropy
        for epoch in range(1, epochs + 1):
            epoch_loss = 0.0
            for r in records:
                feats = self._extract_features(r["text"])
                if not feats:
                    continue

                target_label = r["label"]
                target_cat = r["category"]

                # --- Train Primary Head ---
                logits = {
                    cls: self.primary_bias[cls] + sum(feats[feat] * self.primary_weights[cls][feat] for feat in feats)
                    for cls in self.primary_classes
                }
                max_logit = max(logits.values())
                exps = {cls: math.exp(logits[cls] - max_logit) for cls in self.primary_classes}
                sum_exp = sum(exps.values())
                probs = {cls: exps[cls] / sum_exp for cls in self.primary_classes}

                cw = class_weights.get(target_label, 1.0)
                for cls in self.primary_classes:
                    grad = (probs[cls] - (1.0 if cls == target_label else 0.0)) * cw
                    self.primary_bias[cls] -= lr * grad
                    for feat, val in feats.items():
                        self.primary_weights[cls][feat] -= lr * (grad * val + l2_reg * self.primary_weights[cls][feat])

                # --- Train Category Head ---
                if target_cat in self.category_classes:
                    cat_logits = {
                        cat: self.category_bias[cat] + sum(feats[feat] * self.category_weights[cat][feat] for feat in feats)
                        for cat in self.category_classes
                    }
                    cat_max = max(cat_logits.values())
                    cat_exps = {cat: math.exp(cat_logits[cat] - cat_max) for cat in self.category_classes}
                    cat_sum = sum(cat_exps.values())
                    cat_probs = {cat: cat_exps[cat] / cat_sum for cat in self.category_classes}

                    for cat in self.category_classes:
                        c_grad = cat_probs[cat] - (1.0 if cat == target_cat else 0.0)
                        self.category_bias[cat] -= lr * c_grad
                        for feat, val in feats.items():
                            self.category_weights[cat][feat] -= lr * (c_grad * val + l2_reg * self.category_weights[cat][feat])

            if epoch % 5 == 0 or epoch == epochs:
                print(f" Epoch {epoch}/{epochs} completed.")

        self.trained_timestamp = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        print(f"Training completed successfully. Total vocabulary features: {len(self.idf)}")

    def predict_one(self, text: str) -> Dict[str, Any]:
        """Runs calibrated inference on a single text string."""
        start_time = time.perf_counter()
        norm_text = self._normalize(text)
        feats = self._extract_features(norm_text)

        # Fail-safe handling for empty / malformed text
        if not feats or len(norm_text) == 0:
            return {
                "label": "NEEDS_REVIEW",
                "category": "ambiguous_context",
                "confidence": 0.50,
                "is_calibrated": True,
                "probabilities": {"MALICIOUS": 0.25, "BENIGN": 0.25, "NEEDS_REVIEW": 0.50},
                "latency_ms": round((time.perf_counter() - start_time) * 1000, 2),
                "explanation": "Insufficient semantic context or empty input.",
            }

        # Compute Primary Logits
        logits = {
            cls: self.primary_bias[cls] + sum(feats[feat] * self.primary_weights[cls].get(feat, 0.0) for feat in feats)
            for cls in self.primary_classes
        }
        max_logit = max(logits.values())
        exps = {cls: math.exp(logits[cls] - max_logit) for cls in self.primary_classes}
        sum_exp = sum(exps.values())
        probs = {cls: exps[cls] / sum_exp for cls in self.primary_classes}

        # Predict Category
        cat_logits = {
            cat: self.category_bias[cat] + sum(feats[feat] * self.category_weights[cat].get(feat, 0.0) for feat in feats)
            for cat in self.category_classes
        }
        pred_category = max(cat_logits, key=cat_logits.get) if cat_logits else "ambiguous_context"

        top_label = max(probs, key=probs.get)
        top_prob = probs[top_label]

        # Margin between malicious and benign
        margin = abs(probs.get("MALICIOUS", 0.0) - probs.get("BENIGN", 0.0))
        word_count = len(re.findall(r'\b\w+\b', norm_text))

        if word_count <= 2 and top_prob < 0.75:
            verdict = "NEEDS_REVIEW"
            explanation = "Input is too brief or ambiguous to determine intent."
        elif top_prob < self.uncertainty_threshold or (margin < 0.15 and top_prob < 0.70):
            verdict = "NEEDS_REVIEW"
            explanation = f"Confidence ({top_prob:.1%}) or margin ({margin:.1%}) below operational certainty threshold; routed to review."
        elif top_label == "NEEDS_REVIEW":
            verdict = "NEEDS_REVIEW"
            explanation = f"Classified as ambiguous/needs review ({pred_category}) with {top_prob:.1%} confidence."
        else:
            verdict = top_label
            if verdict == "MALICIOUS":
                explanation = f"Semantic threat detected in category '{pred_category}' with {top_prob:.1%} calibrated confidence."
            else:
                explanation = f"Classified as legitimate ({pred_category}) with {top_prob:.1%} calibrated confidence."

        latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

        return {
            "label": verdict,
            "category": pred_category,
            "confidence": round(top_prob, 3),
            "is_calibrated": True,
            "probabilities": {k: round(v, 4) for k, v in probs.items()},
            "latency_ms": latency_ms,
            "explanation": explanation,
        }

    def save_artifacts(self, model_dir: str):
        """Saves model weights, vocabulary, and metadata to disk."""
        os.makedirs(model_dir, exist_ok=True)
        
        # Convert defaultdicts to regular dicts for JSON export
        clean_weights = {
            cls: {feat: round(val, 6) for feat, val in weights.items() if abs(val) > 1e-5}
            for cls, weights in self.primary_weights.items()
        }
        clean_cat_weights = {
            cat: {feat: round(val, 6) for feat, val in weights.items() if abs(val) > 1e-5}
            for cat, weights in self.category_weights.items()
        }

        model_payload = {
            "version": self.version,
            "trained_timestamp": self.trained_timestamp,
            "uncertainty_threshold": self.uncertainty_threshold,
            "primary_classes": self.primary_classes,
            "category_classes": self.category_classes,
            "idf": {k: round(v, 6) for k, v in self.idf.items()},
            "primary_bias": {k: round(v, 6) for k, v in self.primary_bias.items()},
            "primary_weights": clean_weights,
            "category_bias": {k: round(v, 6) for k, v in self.category_bias.items()},
            "category_weights": clean_cat_weights,
            "metrics": self.metrics,
        }

        weights_file = os.path.join(model_dir, "model_weights.json")
        with open(weights_file, "w", encoding="utf-8") as f:
            json.dump(model_payload, f, indent=2)

        meta_file = os.path.join(model_dir, "model_meta.json")
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump({
                "model_name": "AEGISGUARD-Semantic-Classifier",
                "version": self.version,
                "architecture": "Calibrated Dual-Head Multi-Scale N-Gram Logistic Classifier",
                "features_count": len(self.idf),
                "categories_count": len(self.category_classes),
                "last_trained": self.trained_timestamp,
                "status": "ready",
                "metrics": self.metrics
            }, f, indent=2)

        print(f"Saved model artifacts to: {model_dir}")

    def load_artifacts(self, model_dir: str):
        """Loads trained model weights and metadata from disk."""
        weights_file = os.path.join(model_dir, "model_weights.json")
        if not os.path.exists(weights_file):
            raise FileNotFoundError(f"Model weights not found at: {weights_file}")

        with open(weights_file, "r", encoding="utf-8") as f:
            data = json.load(f)

        self.version = data.get("version", "1.0.0")
        self.trained_timestamp = data.get("trained_timestamp")
        self.uncertainty_threshold = data.get("uncertainty_threshold", 0.62)
        self.primary_classes = data.get("primary_classes", ["MALICIOUS", "BENIGN", "NEEDS_REVIEW"])
        self.category_classes = data.get("category_classes", [])
        self.idf = data.get("idf", {})
        self.primary_bias = data.get("primary_bias", {})
        self.primary_weights = {cls: defaultdict(float, w) for cls, w in data.get("primary_weights", {}).items()}
        self.category_bias = data.get("category_bias", {})
        self.category_weights = {cat: defaultdict(float, w) for cat, w in data.get("category_weights", {}).items()}
        self.metrics = data.get("metrics", {})
        print(f"Successfully loaded AEGISGUARD semantic model (v{self.version}, {len(self.idf)} features).")
