# Antigravity Prompt — VitaScan Whole-Project Scaffold

Paste everything below the line into Antigravity as your initial task prompt. It's self-contained. This scaffolds the *entire* repo — both ML paths, the shared explanation layer, the frontend, and the git/collaboration tooling — because three other teammates (and their own coding agents) will be working in this same repo alongside me.

---

I'm building **VitaScan** with a 4-person team, on one shared GitHub repo. It's a full-stack system that grades nutritional deficiency severity (iron, B12, folate, anemia) from two input types: a blood report (OCR → graph attention network) and an optional symptom photo (CNN cross-check). Both feed one LLM-powered explanation layer and one frontend. This is a college capstone project.

Because four people (each possibly using their own coding agent) will build different pieces of this at the same time, **the repo structure and inter-module contracts matter as much as the code itself.** Please scaffold the whole thing — folder structure, module stubs, JSON contracts, git/PR tooling — in one pass, not just one module.

## Architecture

```
                    Blood Report Upload          Symptom Photo Upload (optional)
                          │                                │
                          ▼                                ▼
                   ┌─────────────┐                 ┌──────────────┐
                   │   PATH B     │                 │   PATH A      │
                   │ B1 Extractor │                 │ A1 Preprocess │
                   │ B2 Normalize │                 │ A2 CNN        │
                   │ B3 Graph+GAT │                 │ A3 Crosscheck │
                   │   +Baselines │                 │               │
                   └──────┬───────┘                 └───────┬───────┘
                          │ modB3_output.json               │ modA3_output.json
                          └───────────────┬───────────────────┘
                                          ▼
                          ┌────────────────────────────────┐
                          │  MOD C — Explainer + Formatter   │
                          │  (merge A+B, call LLM,           │
                          │   FSSAI diet check, build         │
                          │   frontend JSON)                  │
                          └────────────────┬───────────────────┘
                                           ▼
                                modC_frontend_output.json
                                           │
                                           ▼
                              port 8080 → /results/*
                             (proxied via orchestrator, port 8000)
```

Path A is optional per-request (a user might not upload a symptom photo) — the orchestrator should handle that gracefully, running Path B alone.

## Full repository structure to create

```
vitascan/
├── .github/
│   ├── workflows/
│   │   └── ci.yml
│   ├── CODEOWNERS
│   └── PULL_REQUEST_TEMPLATE.md
├── docs/
│   ├── PRD.md                            ← placeholder, I'll paste my own content in
│   ├── CONTRIBUTING.md                   ← see git workflow section below, write full content
│   └── schemas/
│       ├── modB3_output.schema.json
│       ├── modA3_output.schema.json
│       └── modC_frontend_output.schema.json
├── backend/
│   ├── run_pipeline.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── path_b_blood_report/
│   │   ├── mod_b1_extractor/extractor.py
│   │   ├── mod_b2_normalizer/normalizer.py
│   │   ├── mod_b2_normalizer/biomarker_reference.json
│   │   └── mod_b3_grader/
│   │       ├── graph_builder.py
│   │       ├── gat_model.py              ← stub class, not trained
│   │       ├── baseline_models.py        ← LR/RF/XGBoost stubs
│   │       └── grader.py
│   ├── path_a_symptom_image/
│   │   ├── mod_a1_preprocess/preprocess.py
│   │   ├── mod_a2_cnn/cnn_model.py       ← stub class, not trained
│   │   └── mod_a3_crosscheck/crosscheck.py
│   ├── mod_c_explainer/
│   │   ├── explainer.py                  ← LLM call wrapper, env-var API key
│   │   ├── fssai_check.py                ← stub, currently passes everything through
│   │   └── formatter.py                  ← builds modC_frontend_output.json, serves on port 8080
│   └── shared/
│       ├── mock_data.py                  ← generates a valid modC_frontend_output.json sample
│       └── schemas.py                    ← Pydantic models matching docs/schemas/*.json exactly
├── research/
│   ├── gat_training/README.md            ← notes where datasets come from, not committed here
│   ├── cnn_training/README.md
│   └── datasets/.gitkeep                 ← this folder itself is gitignored except this file
├── frontend/
│   ├── (Next.js + TypeScript + Tailwind)
│   ├── app/upload/
│   ├── app/processing/
│   ├── app/results/
│   ├── app/results/[type]/
│   └── lib/api.ts
├── .gitignore
└── README.md
```

## Exact JSON contracts — implement these precisely, do not deviate

**docs/schemas/modB3_output.schema.json** (Path B → Mod C):
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
`severity` should be treated as an open string-keyed map in the Pydantic model, not hardcoded to exactly 4 keys — the deficiency scope may change later.

**docs/schemas/modA3_output.schema.json** (Path A → Mod C, optional field on the merged request):
```json
{
  "patient_id": "string",
  "crosscheck_signal": {
    "anemia": { "confidence": 0.0, "source": "nails | eyes | skin | tongue | hair", "agrees_with_path_b": true }
  },
  "model_confidence": 0.0
}
```

**docs/schemas/modC_frontend_output.schema.json** (Mod C → Frontend, the only thing the frontend reads):
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

## API endpoints (orchestrator, port 8000 — the only port the frontend talks to)

- `GET /` — health check
- `POST /upload-report` — blood report PDF/image, required
- `POST /upload-symptom-photo` — symptom photo, optional, separate endpoint
- `GET /status` — per-module progress across both paths
- `GET /results`, `/results/summary`, `/results/deficiencies`, `/results/deficiencies/{type}` — proxy to Mod C's port 8080 server

## Git & collaboration tooling — build this too, it's not optional

**`.github/CODEOWNERS`** (use these placeholder handles, I'll swap in real ones):
```
/backend/path_b_blood_report/   km-kurisu
/research/gat_training/          km-kurisu
/backend/path_a_symptom_image/  khandelwal10urvi
/research/cnn_training/          khandelwal10urvi
/backend/mod_c_explainer/       @teammate-3
/backend/run_pipeline.py        @teammate-3 km-kurisu
/backend/shared/                @teammate-3 nehaparab25
/frontend/                      nehaparab25
/docs/schemas/                  km-kurisu khandelwal10urvi @teammate-3 nehaparab25
```

**`.github/PULL_REQUEST_TEMPLATE.md`** should prompt for: what changed, which module(s) touched, whether any file under `docs/schemas/` changed (and if so, which owners were tagged), and how it was tested.

**`.github/workflows/ci.yml`** should run on every PR into `dev`:
- Python lint (ruff or flake8) + pytest on `backend/` only (exclude `research/`)
- Frontend `npm run lint` + `npm run build`
- A schema-check step that validates `backend/shared/schemas.py` Pydantic models still match `docs/schemas/*.json`

**`docs/CONTRIBUTING.md`** should document: branch structure (`main` protected ← `dev` ← `feature/<module>-<desc>` branches), commit convention (conventional commits, e.g. `feat(modb3): ...`), PR rules (target `dev` never `main`, 1 approval minimum, 2 approvals for anything touching `run_pipeline.py`/`shared/`/`docs/schemas/`), and a short section titled "How coding agents should behave in this repo" instructing any agent working in it to: stay inside its assigned module folder, branch off `dev` and never commit directly to `main`/`dev`, treat `docs/schemas/*` as read-only unless the task is explicitly a contract change, always finish by opening a PR rather than merging directly, and use `backend/shared/mock_data.py` when building against another module's not-yet-finished output.

**`.gitignore`** must cover: `__pycache__/`, `*.pyc`, `node_modules/`, `.env`, `*_output.json` (generated pipeline artifacts, not source), `research/datasets/*` (except `.gitkeep`), and standard OS/editor junk.

## What to actually build right now

1. Scaffold the full folder structure above, including `.github/` and `docs/` tooling — not just the ML code.
2. Mod B1: working PDF text extraction via PyMuPDF, TODO marker for Tesseract OCR fallback.
3. Mod B2: alias/normalization logic against a small seed `biomarker_reference.json`.
4. Mod B3: rule-based severity fallback (threshold logic on Mod B2's deviation scores) returning the exact schema above; GAT/baseline model files exist as clearly stubbed classes with `# TODO: replace with trained model`.
5. Mod A1/A2/A3: preprocessing pipeline + a stubbed CNN class (`# TODO: replace with trained model`) + a crosscheck function returning the schema above with placeholder confidence values.
6. Mod C: provider-agnostic LLM wrapper reading the API key from `.env` (don't hardcode provider specifics I haven't confirmed), FSSAI check as a pass-through stub, formatter that merges Path A (optional) + Path B into `modC_frontend_output.json` and serves it on port 8080.
7. `backend/shared/mock_data.py` generating a realistic full payload so frontend work never blocks on backend readiness.
8. The Next.js + Tailwind frontend: Upload page (blood report required, symptom photo optional) → Processing page (polls `/status`) → Results dashboard (severity cards, color-coded by band, crosscheck indicator) → Deficiency detail page. Build against the mock data endpoint.
9. All the git/CI/CODEOWNERS/PR-template/CONTRIBUTING.md tooling described above.
10. Root `README.md` with setup + run instructions for backend and frontend, and a link to `docs/CONTRIBUTING.md`.

Ask me before installing anything with a system-level dependency (e.g. the Tesseract binary) or touching secrets/API keys. Otherwise build the full scaffold — code, contracts, and git tooling together — in one pass.

---

## Setup checklist (before/alongside running the prompt above)

- [ ] **Python 3.11** via conda or venv
- [ ] **Node.js 20+** and npm or pnpm
- [ ] **Tesseract OCR binary** on PATH (Path B's scanned-report fallback)
- [ ] **Groq API key** (or whichever LLM provider) in `backend/.env`, never committed
- [ ] **GitHub repo created**, `main` branch protection turned on (require PR + review) before anyone starts pushing feature branches
- [ ] **Real GitHub handles** swapped into `.github/CODEOWNERS` once roles are assigned
- [ ] **Module ownership agreed** with your 3 teammates — who owns Path A, Path B, Mod C, frontend — before writing feature code, so branch/PR/CODEOWNERS actually reflect reality
- [ ] **Sample blood report PDFs + a few symptom photos** on hand for testing extraction once it's live
- [ ] **GPU access plan** for later GAT/CNN training — Colab/Kaggle if no local GPU, not needed for scaffolding
- [ ] Everyone pushes one trivial PR through the full branch → PR → review → merge flow once, before real feature work starts, so the process is proven