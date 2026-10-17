import os
import sys
import json
import time
from training.dataset import load_full_dataset
from training.model import SemanticThreatClassifier

def train_pipeline(data_dir: str = "data", output_dir: str = "models/aegisguard-classifier"):
    """
    Executes the complete machine learning training pipeline.
    """
    print("===============================================================")
    print("   AEGISGUARD SEMANTIC THREAT CLASSIFIER - TRAINING PIPELINE   ")
    print("===============================================================\n")

    start_time = time.time()
    
    # 1. Load Data Splits
    print("[1/5] Loading and validating dataset splits...")
    train_records, val_records, test_records, hn_records = load_full_dataset(data_dir)
    print(f"Loaded: {len(train_records)} Train, {len(val_records)} Validation, {len(test_records)} Test, {len(hn_records)} Hard Negatives.\n")

    # 2. Initialize Model
    print("[2/5] Initializing dual-head multi-scale n-gram semantic classifier...")
    classifier = SemanticThreatClassifier(uncertainty_threshold=0.60)

    # 3. Train Model
    print("[3/5] Fine-tuning model weights with class balancing...")
    classifier.fit(train_records, epochs=35, lr=0.18, l2_reg=0.0002)
    print()

    # 4. Validate on Validation Set
    print("[4/5] Evaluating on validation set...")
    val_correct = 0
    val_malicious_tp = 0
    val_malicious_fn = 0
    val_malicious_fp = 0
    val_benign_tn = 0

    for r in val_records:
        pred = classifier.predict_one(r["text"])
        is_match = (pred["label"] == r["label"])
        if is_match:
            val_correct += 1

        if r["label"] == "MALICIOUS" and pred["label"] == "MALICIOUS":
            val_malicious_tp += 1
        elif r["label"] == "MALICIOUS" and pred["label"] != "MALICIOUS":
            val_malicious_fn += 1
        elif r["label"] == "BENIGN" and pred["label"] == "MALICIOUS":
            val_malicious_fp += 1
        elif r["label"] == "BENIGN" and pred["label"] == "BENIGN":
            val_benign_tn += 1

    val_acc = val_correct / max(1, len(val_records))
    val_prec = val_malicious_tp / max(1, val_malicious_tp + val_malicious_fp)
    val_rec = val_malicious_tp / max(1, val_malicious_tp + val_malicious_fn)
    val_f1 = (2 * val_prec * val_rec) / max(1e-5, val_prec + val_rec)

    print(f"Validation Metrics -> Accuracy: {val_acc:.1%}, Precision: {val_prec:.1%}, Recall: {val_rec:.1%}, F1: {val_f1:.3f}\n")

    # 5. Save Model Artifacts
    print(f"[5/5] Exporting model weights and metadata to {output_dir}...")
    classifier.metrics = {
        "train_samples": len(train_records),
        "val_samples": len(val_records),
        "test_samples": len(test_records),
        "hard_negative_samples": len(hn_records),
        "val_accuracy": round(val_acc, 4),
        "val_precision": round(val_prec, 4),
        "val_recall": round(val_rec, 4),
        "val_f1": round(val_f1, 4),
        "training_duration_seconds": round(time.time() - start_time, 2)
    }
    classifier.save_artifacts(output_dir)

    # Also mirror metadata to data/training_metadata.json for UI access
    os.makedirs("data", exist_ok=True)
    with open(os.path.join("data", "training_metadata.json"), "w", encoding="utf-8") as f:
        json.dump({
            "status": "trained",
            "last_trained": classifier.trained_timestamp,
            "version": classifier.version,
            "architecture": "Calibrated Dual-Head Multi-Scale N-Gram Logistic Classifier",
            "dataset_sizes": {
                "train": len(train_records),
                "validation": len(val_records),
                "test": len(test_records),
                "hard_negatives": len(hn_records),
                "demonstration": 40
            },
            "metrics": classifier.metrics
        }, f, indent=2)

    print("\nTraining pipeline executed successfully!")
    return classifier

if __name__ == "__main__":
    train_pipeline()
