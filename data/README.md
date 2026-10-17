# AEGISGUARD Semantic Threat Classification Dataset

## Overview
This directory contains the machine learning dataset for AEGISGUARD's supervised semantic threat classifier. The dataset is specifically engineered to distinguish harmful malicious requests from benign educational, defensive, preventive, and emergency assistance queries.

> [!NOTE]
> All records in this dataset are synthetic examples generated for safety research and model training. No real-world user communications or personally identifiable data are included. Dangerous categories use non-operational descriptions and do NOT contain actionable manufacturing or attack instructions.

## Schema
Each CSV file (`train.csv`, `validation.csv`, `test.csv`, `hard_negatives.csv`) contains:
- `id`: Unique identifier (e.g., `AEGIS-0001`, `DEMO-ATK-01`, `DEMO-NRM-01`).
- `text`: Complete input sentence or query.
- `label`: Supervised target class (`MALICIOUS`, `BENIGN`, `NEEDS_REVIEW`).
- `category`: Fine-grained semantic category (one of 20 categories).
- `context_or_intent`: Contextual flag (e.g., `defensive`, `preventive`, `harmful_intent`, `negated_harmful_intent`, `victim_report`, `academic`).
- `is_synthetic`: Boolean flag set to `true`.

## 20 Semantic Categories
1. `violence_and_threats` (Malicious)
2. `killing_and_physical_harm` (Malicious)
3. `bomb_threats_and_explosives` (Malicious)
4. `robbery_and_theft` (Malicious)
5. `fraud_and_financial_deception` (Malicious)
6. `cyber_abuse_and_unauthorized_access` (Malicious)
7. `malware_and_malicious_software` (Malicious)
8. `self_harm_and_suicide` (Malicious/Crisis)
9. `privacy_violations` (Malicious)
10. `weapons_misuse` (Malicious)
11. `harassment_and_coercion` (Malicious)
12. `prompt_injection` (Malicious/Injection)
13. `benign_education_and_academic` (Benign)
14. `crime_prevention_and_public_safety` (Benign)
15. `cybersecurity_defense` (Benign)
16. `fraud_prevention` (Benign)
17. `news_research_historical` (Benign)
18. `fictional_or_hypothetical` (Benign)
19. `emergency_assistance` (Benign)
20. `ambiguous_context` (Needs Review)

## Hard Negatives
`hard_negatives.csv` contains paired examples where dangerous keywords (`robbery`, `bomb`, `hack`, `fraud`, `suicide`, `attack`) appear in benign defensive, preventive, or academic contexts.
