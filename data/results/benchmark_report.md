# Prompt-Injection Firewall Benchmark Report
Generated at: **2026-10-17T06:47:02.267Z**

## Summary Metrics
- **Total Test Cases**: 114 (57 Attacks, 57 Benign)
- **Standard Recall (Detection Rate)**: **100.0%** (TP: 57, FN: 0)
- **Standard Precision**: **100.0%** (FP: 0)
- **Accuracy**: **100.0%**
- **F1 Score**: **1.000**
- **Neutralization Rate**: **100.0%**
- **Fact Preservation Rate**: **100.0%**
- **Average Scan Latency**: **0.22 ms**

### Confusion Matrix (Standard: Flagged = SUSPICIOUS | MALICIOUS)
| | Predicted Attack (Flagged) | Predicted Normal (Safe) |
|---|---|---|
| **Actual Attack** | **57** (TP) | **0** (FN) |
| **Actual Normal** | **0** (FP) | **57** (TN) |

### Strict Mode (Flagged = MALICIOUS only)
- **Strict Recall**: 100.0%
- **Strict Precision**: 100.0%
- **Strict F1**: 1.000

## Per-Category Recall
| Category | Total Cases | Detected | Recall Rate |
|---|---|---|---|
| `INSTRUCTION_OVERRIDE` | 18 | 18 | 100.0% |
| `SYSTEM_PROMPT_EXFIL` | 2 | 2 | 100.0% |
| `DATA_EXFILTRATION` | 4 | 4 | 100.0% |
| `ROLE_HIJACK` | 5 | 5 | 100.0% |
| `TOOL_ACTION_MANIPULATION` | 3 | 3 | 100.0% |
| `TASK_REDIRECTION` | 2 | 2 | 100.0% |
| `CONCEALMENT` | 3 | 3 | 100.0% |
| `HIDDEN_CONTENT` | 10 | 10 | 100.0% |
| `AUTHORITY_IMPERSONATION` | 4 | 4 | 100.0% |
| `DELIMITER_ESCAPE` | 3 | 3 | 100.0% |
| `OUTPUT_MANIPULATION` | 3 | 3 | 100.0% |

## Failures & Discrepancies
✅ Zero false positives and zero false negatives recorded on this evaluation run!
