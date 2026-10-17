import sys
import json
import os
from training.model import SemanticThreatClassifier

def main():
    model_dir = os.environ.get("AEGIS_MODEL_DIR", "models/aegisguard-classifier")
    classifier = SemanticThreatClassifier()
    try:
        classifier.load_artifacts(model_dir)
    except Exception as e:
        sys.stderr.write(f"Failed to load model from {model_dir}: {e}\n")
        print(json.dumps({
            "error": f"Model artifact error: {str(e)}",
            "label": "NEEDS_REVIEW",
            "category": "ambiguous_context",
            "confidence": 0.0,
            "status": "error"
        }))
        sys.exit(1)

    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
        result = classifier.predict_one(query)
        print(json.dumps(result, indent=2))
    else:
        # Read from stdin for batch/pipe processing
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            try:
                data = json.loads(line)
                text = data.get("text", "")
                res = classifier.predict_one(text)
                print(json.dumps(res))
                sys.stdout.flush()
            except Exception as e:
                res = classifier.predict_one(line)
                print(json.dumps(res))
                sys.stdout.flush()

if __name__ == "__main__":
    main()
