## Description

Briefly describe the changes introduced by this pull request.

## Target Module(s)

- [ ] Path B (`backend/path_b_blood_report/` or `research/gat_training/`)
- [ ] Path A (`backend/path_a_symptom_image/` or `research/cnn_training/`)
- [ ] Mod C (`backend/mod_c_explainer/`)
- [ ] Orchestrator / Shared (`backend/run_pipeline.py` or `backend/shared/`)
- [ ] Frontend (`frontend/`)
- [ ] Docs / Schemas (`docs/schemas/`)

## Contract Changes Check

- [ ] Does this PR modify any file under `docs/schemas/*`?
  - If **YES**, have you tagged all CODEOWNERS for `docs/schemas/` in this PR for explicit approval?

## How Was This Tested?

- [ ] Unit tests passed (`pytest backend/`)
- [ ] Frontend lint & build passed (`npm run lint && npm run build`)
- [ ] Manual end-to-end testing performed using `backend/shared/mock_data.py` or real pipeline.

## Checklist

- [ ] Target branch is `dev` (never merge directly to `main`).
- [ ] Commit messages follow conventional commits (e.g. `feat(modb3): ...`).
- [ ] Code is scoped ONLY to your assigned module folder unless explicitly approved.
