import os
import json
import time
from collections import defaultdict
from training.dataset import load_csv_data
from training.model import SemanticThreatClassifier

def evaluate_pipeline(
    data_dir: str = "data",
    model_dir: str = "models/aegisguard-classifier",
    output_report: str = "models/aegisguard-classifier/evaluation_report.json"
):
    """
    Evaluates the trained model on held-out test data and hard negatives.
    """
    print("===============================================================")
    print("   AEGISGUARD SEMANTIC THREAT CLASSIFIER - HELD-OUT EVALUATION ")
    print("===============================================================\n")

    # Load Model
    classifier = SemanticThreatClassifier()
    classifier.load_artifacts(model_dir)

    test_file = os.path.join(data_dir, "test.csv")
    hn_file = os.path.join(data_dir, "hard_negatives.csv")

    test_records = load_csv_data(test_file)
    hn_records = load_csv_data(hn_file) if os.path.exists(hn_file) else []
    all_eval = test_records + hn_records

    print(f"\nEvaluating on {len(all_eval)} unseen samples ({len(test_records)} standard test + {len(hn_records)} hard negatives)...\n")

    # Confusion Matrix: [Actual][Predicted]
    labels = ["MALICIOUS", "BENIGN", "NEEDS_REVIEW"]
    confusion_matrix = {act: {pred: 0 for pred in labels} for act in labels}
    
    category_stats = defaultdict(lambda: {"total": 0, "correct": 0, "fn": 0, "fp": 0})
    case_results = []
    
    tp = 0
    fp = 0
    tn = 0
    fn = 0
    latencies = []

    for r in all_eval:
        res = classifier.predict_one(r["text"])
        latencies.append(res["latency_ms"])
        
        act = r["label"]
        pred = res["label"]
        cat = r["category"]

        confusion_matrix[act][pred] += 1
        category_stats[cat]["total"] += 1

        is_correct = (pred == act)
        if is_correct:
            category_stats[cat]["correct"] += 1

        # Binary threat metrics (MALICIOUS vs SAFE/BENIGN)
        if act == "MALICIOUS" and pred == "MALICIOUS":
            tp += 1
        elif act != "MALICIOUS" and pred == "MALICIOUS":
            fp += 1
            category_stats[cat]["fp"] += 1
        elif act != "MALICIOUS" and pred != "MALICIOUS":
            tn += 1
        elif act == "MALICIOUS" and pred != "MALICIOUS":
            fn += 1
            category_stats[cat]["fn"] += 1

        case_results.append({
            "id": r["id"],
            "text": r["text"],
            "expected_label": act,
            "predicted_label": pred,
            "expected_category": cat,
            "predicted_category": res["category"],
            "confidence": res["confidence"],
            "is_correct": is_correct,
            "latency_ms": res["latency_ms"]
        })

    total_eval = len(all_eval)
    accuracy = (tp + tn) / max(1, total_eval)
    precision = tp / max(1, tp + fp)
    recall = tp / max(1, tp + fn)
    f1 = (2 * precision * recall) / max(1e-5, precision + recall)
    fpr = fp / max(1, fp + tn)
    fnr = fn / max(1, fn + tp)
    avg_latency = sum(latencies) / max(1, len(latencies))

    # Hard Negatives specific evaluation
    hn_total = len(hn_records)
    hn_correct = 0
    for r in hn_records:
        res = classifier.predict_one(r["text"])
        if res["label"] == r["label"]:
            hn_correct += 1
    hn_accuracy = hn_correct / max(1, hn_total) if hn_total > 0 else 1.0

    print("-------------------- EVALUATION METRICS --------------------")
    print(f"Total Evaluated Cases:   {total_eval}")
    print(f"Overall Accuracy:        {accuracy:.1%}")
    print(f"Precision (Malicious):   {precision:.1%}")
    print(f"Recall (Malicious):      {recall:.1%}")
    print(f"F1 Score:                {f1:.3f}")
    print(f"False Positive Rate:     {fpr:.1%}")
    print(f"False Negative Rate:     {fnr:.1%}")
    print(f"Hard Negatives Accuracy: {hn_accuracy:.1%} ({hn_correct}/{hn_total})")
    print(f"Average Inference Speed: {avg_latency:.2f} ms/query")

    print("\n-------------------- CONFUSION MATRIX ----------------------")
    header_title = "Actual \\ Predicted"
    print(f"{header_title:<20} {'MALICIOUS':<12} {'BENIGN':<10} {'NEEDS_REVIEW':<12}")
    for act in labels:
        print(f"{act:<20} {confusion_matrix[act]['MALICIOUS']:<12} {confusion_matrix[act]['BENIGN']:<10} {confusion_matrix[act]['NEEDS_REVIEW']:<12}")

    print("\n----------------- PER-CATEGORY RECALL ----------------------")
    for cat, stats in sorted(category_stats.items()):
        rec = stats["correct"] / max(1, stats["total"])
        print(f"  {cat:<38}: {stats['correct']}/{stats['total']} ({rec:.0%})")

    # Export Evaluation JSON
    report_data = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "model_version": classifier.version,
        "total_cases": total_eval,
        "metrics": {
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "false_positive_rate": round(fpr, 4),
            "false_negative_rate": round(fnr, 4),
            "hard_negatives_accuracy": round(hn_accuracy, 4),
            "avg_latency_ms": round(avg_latency, 2)
        },
        "confusion_matrix": confusion_matrix,
        "per_category": {
            cat: {
                "total": stats["total"],
                "correct": stats["correct"],
                "accuracy": round(stats["correct"] / max(1, stats["total"]), 4)
            }
            for cat, stats in category_stats.items()
        },
        "results_sample": case_results[:20]
    }

    os.makedirs(os.path.dirname(output_report), exist_ok=True)
    with open(output_report, "w", encoding="utf-8") as f:
        json.dump(report_data, f, indent=2)

    print(f"\nSaved evaluation report to: {output_report}")
    return report_data

if __name__ == "__main__":
    evaluate_pipeline()
