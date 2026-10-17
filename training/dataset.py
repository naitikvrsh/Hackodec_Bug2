import os
import csv
from typing import List, Dict, Tuple, Set

REQUIRED_COLUMNS = {"id", "text", "label", "category", "context_or_intent", "is_synthetic"}
VALID_LABELS = {"MALICIOUS", "BENIGN", "NEEDS_REVIEW"}

def load_csv_data(filepath: str) -> List[Dict[str, str]]:
    """Loads a CSV dataset split and validates required fields."""
    if not os.path.exists(filepath):
        raise FileNotFoundError(f"Dataset split not found at: {filepath}")

    records = []
    with open(filepath, mode="r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        fields = set(reader.fieldnames or [])
        missing = REQUIRED_COLUMNS - fields
        if missing:
            raise ValueError(f"CSV {filepath} missing required columns: {missing}")

        for row_idx, row in enumerate(reader, start=2):
            label = row["label"].strip().upper()
            if label not in VALID_LABELS:
                raise ValueError(f"Invalid label '{label}' at line {row_idx} in {filepath}")
            records.append({
                "id": row["id"].strip(),
                "text": row["text"].strip(),
                "label": label,
                "category": row["category"].strip(),
                "context_or_intent": row.get("context_or_intent", "").strip(),
                "is_synthetic": row.get("is_synthetic", "true").lower() == "true"
            })
    return records

def check_data_leakage(train_records: List[Dict], eval_records: List[Dict], eval_name: str = "eval") -> int:
    """Verifies that no text from evaluation set leaks into training set."""
    train_texts = {r["text"].lower().strip() for r in train_records}
    leakage_count = 0
    for r in eval_records:
        if r["text"].lower().strip() in train_texts:
            leakage_count += 1
            print(f"WARNING: Data leakage detected between train and {eval_name}: '{r['text']}'")
    return leakage_count

def load_full_dataset(data_dir: str = "data") -> Tuple[List[Dict], List[Dict], List[Dict], List[Dict]]:
    """Loads train, validation, test, and hard negatives with leakage verification."""
    train_file = os.path.join(data_dir, "train.csv")
    val_file = os.path.join(data_dir, "validation.csv")
    test_file = os.path.join(data_dir, "test.csv")
    hn_file = os.path.join(data_dir, "hard_negatives.csv")

    train_data = load_csv_data(train_file)
    val_data = load_csv_data(val_file)
    test_data = load_csv_data(test_file)
    hn_data = load_csv_data(hn_file) if os.path.exists(hn_file) else []

    val_leaks = check_data_leakage(train_data, val_data, "validation")
    test_leaks = check_data_leakage(train_data, test_data, "test")

    if val_leaks > 0 or test_leaks > 0:
        print(f"Alert: {val_leaks + test_leaks} overlapping text instances found across splits.")
    else:
        print("Dataset Integrity Verified: Zero data leakage between train and evaluation splits.")

    return train_data, val_data, test_data, hn_data
