# Research Track — Graph Attention Network (GAT) Training

This directory contains experimental training notebooks, graph construction experiments, baseline model benchmark scripts, and dataset preprocessing tools for Path B (GAT).

> [!NOTE]
> Code in `research/` is iterative experimental code. It is excluded from CI python linting and unit tests. Do not import production code from `research/`.

## Datasets
Dataset downloads are stored locally in `research/datasets/` (which is `.gitignored`).

### Dataset Sources:
1. **Muyama Synthetic Anemia Dataset** (Kaggle) — Baseline synthetic tabular dataset for initial model structure validation.
2. **NHANES Clinical Biomarker Survey Data** — National Health and Nutrition Examination Survey datasets for ferritin/hemoglobin joint modeling.
3. **MIMIC-IV Lab Events** (PhysioNet credentialed access) — De-identified clinical laboratory trajectories for longitudinal validation.

## Target Baselines
- Logistic Regression
- Random Forest
- XGBoost
- Graph Convolutional Networks (GCN) vs Graph Attention Networks (GAT)
