# VitaScan — Product Requirements Document

**Version:** 0.2 (Whole-Project Build Phase)
**Team:** 4-person capstone team, Dept. of Computer Engineering
**Institution:** St. John College of Engineering and Management, Palghar
**Purpose of this doc:** Freeze the full-project scope and repo contract so all four team members (and their individual coding agents) can build in parallel on the same GitHub repo without collisions.

---

## 1. Problem Statement

Nutritional deficiencies (iron, B12, folate, and related anemia) are widespread in the Indian population but under-diagnosed. Existing tools either classify one deficiency at a time with no joint reasoning, or infer deficiency from symptom classifiers via unvalidated lookup tables (see: prior senior project VitaML/IRJAEM critique). VitaScan addresses this with two complementary input paths feeding one severity-grading and explanation layer.

## 2. Whole-Project Scope

VitaScan is **not** just the GAT. It's four coordinated pieces, each ownable by a different team member:

| Piece | What it does | Natural owner |
|---|---|---|
| **Path B — Blood Report Pipeline** (primary research contribution) | OCR → India-calibrated normalization → graph construction → GAT joint severity grading → baseline comparison | Whoever is driving the GAT/research track |
| **Path A — Symptom Image Pipeline** (secondary, product feature) | Symptom photo (nails/tongue/eyes/skin/hair) → CNN → anemia/iron cross-check signal | A second teammate, largely independent of Path B until the cross-check merge step |
| **Explanation + Formatting Layer** | Takes Path A + Path B output, calls the LLM for plain-English explanation, checks diet suggestions against FSSAI rules, shapes final frontend-ready JSON | Third teammate, or shared with Path B owner |
| **Frontend + API integration** | Upload flow, processing/status UI, results dashboard, deficiency detail views, talks only to the documented API | Fourth teammate |

These four pieces only ever talk to each other through the JSON contracts in §6. That's the whole point of this structure: nobody needs to read anyone else's internal code to keep working.

## 3. Users

| User | Need |
|---|---|
| Patient / general user | Upload a blood report (and optionally a symptom photo), get a plain-English severity read + diet guidance |
| Clinician (secondary) | Sanity-check biomarker-level reasoning behind a severity grade |
| Evaluators / reviewers | See a defensible, reproducible pipeline with clear novelty (cross-dataset generalization, joint GAT grading) |

## 4. In Scope vs. Out of Scope for This Build Phase

**In scope now:**
- Full repo scaffold for both paths + explanation layer + frontend, with mock data flowing end-to-end before any model is trained.
- All inter-module JSON contracts finalized now (§6), so nobody blocks on anyone else's model being ready.
- Git workflow, branch protection, PR conventions, and module ownership boundaries set up before real feature work starts (§8).

**Explicitly out of scope for now:**
- Multilingual I/O, WBC analysis, BMI, full "Healthcare OS" vision — post-MVP.
- Production security/compliance (auth, encryption at rest, HTTPS, audit logs, de-identification) — needed only if real patient data is used; not needed for capstone demo data.
- Final nutrient scope lock (whether B6/C join iron/B12/folate/anemia) — **still unresolved.** Schemas below are written scope-agnostic so this can be settled later without breaking anything.

## 5. Reference Architecture

Two input paths converge into one explanation/formatting layer, served to one frontend. Structure is adapted from a known-good pattern (numbered modules, strict JSON contracts, one orchestrator, one formatter) so ownership boundaries map directly onto folder boundaries.

```
                    ┌─────────────────────┐        ┌─────────────────────┐
                    │   Blood Report       │        │   Symptom Photo(s)   │
                    │   Upload             │        │   Upload (optional)  │
                    └──────────┬───────────┘        └──────────┬───────────┘
                               │                                │
                               ▼                                ▼
              ┌────────────────────────────┐    ┌──────────────────────────────┐
              │        PATH B                │    │          PATH A               │
              │  Mod B1 Extractor (OCR)      │    │   Mod A1 Preprocess           │
              │  Mod B2 Normalizer           │    │   Mod A2 CNN Inference        │
              │  Mod B3 Graph + GAT +        │    │   Mod A3 Cross-check Signal   │
              │         Baselines            │    │                                │
              └──────────────┬───────────────┘    └───────────────┬────────────────┘
                              │  modB3_output.json                 │ modA3_output.json
                              └───────────────┬─────────────────────┘
                                               ▼
                              ┌───────────────────────────────────┐
                              │   MOD C — Explainer + Formatter    │
                              │   (merges A + B, calls LLM,        │
                              │    FSSAI diet check, builds        │
                              │    frontend JSON)                  │
                              └──────────────────┬──────────────────┘
                                                  ▼
                                        modC_frontend_output.json
                                                  │
                                                  ▼
                                     port 8080 → /results/*
                                    (proxied via orchestrator, port 8000)
```

The orchestrator (`run_pipeline.py`) coordinates both paths and can run Path B alone (Path A is optional — a user might not upload a symptom photo).

## 6. Repository Structure

```
vitascan/
├── .github/
│   ├── workflows/
│   │   └── ci.yml                        ← lint + basic tests on every PR
│   ├── CODEOWNERS                        ← maps folders → GitHub usernames, auto-requests reviewers
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── PRD.md                            ← this file
│   ├── CONTRIBUTING.md                   ← git workflow, branch/PR rules (see companion doc)
│   └── schemas/                          ← canonical JSON schema files, source of truth for §7 below
│       ├── modB3_output.schema.json
│       ├── modA3_output.schema.json
│       └── modC_frontend_output.schema.json
├── backend/
│   ├── run_pipeline.py                   ← orchestrator, FastAPI, port 8000
│   ├── requirements.txt
│   ├── .env.example
│   ├── path_b_blood_report/
│   │   ├── mod_b1_extractor/
│   │   ├── mod_b2_normalizer/
│   │   └── mod_b3_grader/                ← graph builder, GAT model, baseline models
│   ├── path_a_symptom_image/
│   │   ├── mod_a1_preprocess/
│   │   ├── mod_a2_cnn/
│   │   └── mod_a3_crosscheck/
│   ├── mod_c_explainer/                  ← merges both paths, LLM call, FSSAI check, formatter, serves port 8080
│   └── shared/
│       ├── mock_data.py                  ← mock modC_frontend_output payload for frontend dev
│       └── schemas.py                    ← Pydantic models generated from docs/schemas/*.json
├── research/
│   ├── gat_training/                     ← notebooks, dataset prep, experiment logs (not production code, looser review)
│   ├── cnn_training/
│   └── datasets/                         ← .gitignored — large files never committed, README documents download sources
├── frontend/
│   ├── app/
│   │   ├── upload/
│   │   ├── processing/
│   │   ├── results/
│   │   └── results/[type]/
│   └── lib/api.ts
└── README.md
```

**Why `research/` is separate from `backend/`:** training notebooks are iterative and messy by nature. Keeping them out of the production module folders means research commits don't trigger CI on the pipeline code, and production code never accidentally depends on a notebook.

## 7. Exact JSON Contracts

These are the **only** things that cross module/ownership boundaries. Anyone can change what's inside their own module freely; changing a contract requires a PR that touches `docs/schemas/` and tags the owners of every module that consumes it (see CODEOWNERS, §8).

**modB3_output.json** (Path B → Mod C input):
```json
{
  "patient_id": "string",
  "severity": {
    "iron": { "score": 0.0, "band": "none | mild | moderate | severe", "model": "gat | baseline" },
    "b12": { "score": 0.0, "band": "string", "model": "string" },
    "folate": { "score": 0.0, "band": "string", "model": "string" },
    "anemia": { "score": 0.0, "band": "string", "model": "string" }
  },
  "attention_weights": { "iron": { "ferritin": 0.62, "hemoglobin": 0.24, "tibc": 0.14 } },
  "baseline_comparison": { "iron": { "gat": 0.71, "logistic_regression": 0.65, "random_forest": 0.69, "xgboost": 0.70 } },
  "model_confidence": 0.0
}
```
> `severity` keys are an open string map, not hardcoded to exactly 4 — keeps nutrient-scope changes non-breaking.

**modA3_output.json** (Path A → Mod C input, optional — absent if no photo was uploaded):
```json
{
  "patient_id": "string",
  "crosscheck_signal": {
    "anemia": { "confidence": 0.0, "source": "nails | eyes | skin | tongue | hair", "agrees_with_path_b": true }
  },
  "model_confidence": 0.0
}
```

**modC_frontend_output.json** (Mod C → Frontend, the only thing the frontend ever reads):
```json
{
  "generated_at": "ISO-8601 timestamp",
  "schema_version": "1.0",
  "patient": { "patient_id": "string", "age": 0, "gender": "string" },
  "deficiencies": [
    {
      "type": "iron",
      "severity": { "band": "moderate", "score_pct": "71.0%", "badge_color": "#f59e0b" },
      "explanation": "Plain-English text generated by the LLM from attention weights.",
      "key_contributors": [ { "biomarker": "Serum Ferritin", "impact_pct": 62.0, "direction": "negative" } ],
      "crosscheck": { "available": true, "agrees": true, "source": "eyes" },
      "diet_recommendations": [ { "suggestion": "string", "fssai_checked": true } ]
    }
  ],
  "summary": { "flagged_deficiency_count": 0, "overall_risk_band": "string" }
}
```

## 8. Git Workflow & Multi-Agent Collaboration

Full detail lives in the companion `CONTRIBUTING.md`. Summary:

- **`main`** — protected, always demo-able, merges only from `dev` via reviewed PR.
- **`dev`** — integration branch, everyone's feature branches merge here first.
- **Feature branches** — `feature/<module>-<short-desc>`, e.g. `feature/modb1-ocr-extraction`, `feature/frontend-results-dashboard`. One branch per module/task, never a branch that touches two people's folders.
- **CODEOWNERS** maps each top-level module folder to a GitHub username, so PRs auto-request the right reviewer and nobody merges into someone else's module without their sign-off.
- **Contract changes are special:** any PR touching `docs/schemas/*` must tag every module owner listed as a consumer of that schema, and gets merged only after they've acknowledged.
- Whoever's coding agent (Claude Code, Antigravity, Cursor, etc.) is working on a task should be scoped to **that person's module folder only**, branch off `dev`, and open a PR rather than pushing directly — this applies equally whether a human or an agent is making the commit.

## 9. Tech Stack

| Layer | Choice |
|---|---|
| Backend framework | FastAPI + Uvicorn |
| PDF/OCR (Path B) | PyMuPDF (`fitz`) + Tesseract via `pytesseract` |
| Image handling (Path A) | Pillow + torchvision transforms |
| Graph + GAT (Path B) | PyTorch + PyTorch Geometric |
| CNN (Path A) | PyTorch (transfer learning, e.g. ResNet/EfficientNet backbone) |
| Baseline models (Path B) | scikit-learn (LR, RF) + XGBoost |
| LLM explanation (Mod C) | Groq API, provider-agnostic wrapper |
| Frontend | React (Next.js) + Tailwind CSS + TypeScript |
| Charts | Recharts |
| CI | GitHub Actions (lint + basic tests on every PR) |
| Dev environment | Python 3.11 (conda/venv) + Node.js 20+ |

## 10. Open Items Carried Over From Research Track

- **Nutrient scope discrepancy (unresolved):** locked scope earlier included B6/C; GAT plan currently covers iron/B12/folate/anemia only. Schemas are written scope-agnostic so this doesn't block engineering.
- Several literature items in the survey workbook remain unverified — doesn't block engineering work.
- No confirmed real patient data / ethics sign-off — build phase uses synthetic/sample data only.
- Stage-1 presentation placeholders (names, guide, date) still need filling before submission.

## 11. Suggested Milestones (fits 3-month capstone window)

| Weeks | Focus |
|---|---|
| 1 | Repo scaffold, git workflow live (branch protection, CODEOWNERS, PR template), mock data flowing end-to-end through both paths + Mod C + frontend |
| 2–4 | Path B: real OCR/NER + normalization live. Path A: CNN pipeline wired with a pretrained/placeholder model. Frontend: full UI against mock data. |
| 5–7 | GAT training on real datasets (research track); CNN fine-tuning; baseline comparison |
| 8–9 | Swap trained GAT + CNN into their modules, wire real LLM explanation layer, cross-check merge logic in Mod C |
| 10–12 | Integration testing across both paths, baseline comparison writeup, paper/report finalization |