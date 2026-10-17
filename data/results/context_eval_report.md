# Context-Aware Threat Detection: Evaluation Report

Generated on: 2026-10-17T13:40:29.765Z

## Summary Metrics

| Metric | Value |
|---|---|
| Total Labeled Cases | **50** |
| Accuracy | **100.0%** |
| Precision | **100.0%** |
| Recall | **100.0%** |
| F1 Score | **1.000** |
| True Positives (TP) | 31 |
| True Negatives (TN) | 19 |
| False Positives (FP) | 0 |
| False Negatives (FN) | 0 |
| Avg Latency | 3.74 ms/query |

## Confusion Matrix

| | Predicted Harmful / Malicious | Predicted Safe |
|---|---|---|
| **Actual Harmful** | **31 (TP)** | 0 (FN) |
| **Actual Safe** | 0 (FP) | **19 (TN)** |

## Per-Category Performance

| Category | Detected / Expected | Recall |
|---|---|---|
| `ILLEGAL_HACKING_INTENT` | 3 / 3 | 100% |
| `UNAUTHORIZED_ACCESS` | 5 / 5 | 100% |
| `DEFENSIVE_CYBERSECURITY` | 3 / 4 | 75% |
| `SELF_HARM_REPORT_OR_DISCUSSION` | 2 / 2 | 100% |
| `SUICIDAL_IDEATION_OR_INTENT` | 2 / 2 | 100% |
| `SUICIDE_PREVENTION_OR_SUPPORT` | 3 / 3 | 100% |
| `VIOLENCE_AND_CREDIBLE_THREATS` | 2 / 2 | 100% |
| `INSTRUCTION_OVERRIDE` | 2 / 2 | 100% |
| `PRIVACY_VIOLATION` | 1 / 1 | 100% |
| `PROMPT_INJECTION_AND_SAFETY_BYPASS` | 1 / 1 | 100% |
| `SELF_HARM_METHOD_SEEKING` | 3 / 3 | 100% |
| `IMMEDIATE_SELF_HARM_CONCERN` | 1 / 1 | 100% |
| `SELF_HARM_INSTRUCTION_OR_ENCOURAGEMENT` | 1 / 1 | 100% |
| `CREDENTIAL_THEFT` | 2 / 2 | 100% |
| `PASSWORD_ATTACKS` | 1 / 1 | 100% |
| `MALWARE_AND_RANSOMWARE` | 1 / 1 | 100% |
| `PHISHING_AND_SOCIAL_ENGINEERING` | 1 / 1 | 100% |
| `DATA_EXFILTRATION` | 1 / 1 | 100% |
| `CYBER_ATTACK_PLANNING` | 1 / 1 | 100% |
| `AUTHORIZED_SECURITY_TESTING` | 1 / 1 | 100% |
| `WEAPONS_MISUSE` | 2 / 2 | 100% |
| `ROBBERY_AND_THEFT` | 1 / 1 | 100% |
| `FINANCIAL_FRAUD` | 1 / 1 | 100% |
| `IDENTITY_THEFT_AND_FORGERY` | 1 / 1 | 100% |
| `STALKING_AND_HARASSMENT` | 1 / 1 | 100% |
| `DOXXING_AND_PRIVACY_ABUSE` | 1 / 1 | 100% |
| `EXTORTION_AND_BLACKMAIL` | 1 / 1 | 100% |
| `MALICIOUS_DECEPTION` | 1 / 1 | 100% |
