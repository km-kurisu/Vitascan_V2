# VitaScan — Contributing & Git Workflow

This is the living reference for how the 4-person team (and each person's coding agent) works in this repo without stepping on each other. Read this before your first PR.

## 1. Branch Structure

```
main   ← protected. Always demo-able. Only accepts merges from dev.
 └── dev   ← integration branch. Everyone's work lands here first.
      ├── feature/modb1-ocr-extraction
      ├── feature/modb3-gat-baseline-fallback
      ├── feature/moda2-cnn-inference
      ├── feature/modc-llm-explainer
      └── feature/frontend-results-dashboard
```

- Never commit directly to `main` or `dev`.
- One feature branch = one module + one task. If a task genuinely needs to touch two modules (e.g. a contract change), say so explicitly in the branch name and PR description, and tag both owners.
- Branch naming: `feature/<module-shortname>-<short-desc>`, `fix/<module-shortname>-<short-desc>`, `research/<topic>` for anything in `research/`.

## 2. Module Ownership (CODEOWNERS)

Fill in actual GitHub handles once assigned. Suggested split for a 4-person team:

| Folder | Owner | Notes |
|---|---|---|
| `backend/path_b_blood_report/` | [km-kurisu] | OCR, normalization, graph + GAT, baselines |
| `research/gat_training/` | [km-kurisu] | Looser review — research code, not production |
| `backend/path_a_symptom_image/` | [khandelwal10urvi] | CNN pipeline, independent of Path B until Mod C |
| `research/cnn_training/` | [khandelwal10urvi] | Looser review |
| `backend/mod_c_explainer/` | [teammate-3] | LLM explanation, FSSAI check, formatter |
| `backend/run_pipeline.py`, `backend/shared/` | [teammate-3] or shared | Orchestrator + shared contracts, touched rarely, needs 2 approvals |
| `frontend/` | [nehaparab25] | Next.js app, only ever reads `modC_frontend_output.json` shape |
| `docs/schemas/` | shared — CODEOWNERS lists all 4 | Any change here needs every listed owner to approve |

`.github/CODEOWNERS` file content:
```
/backend/path_b_blood_report/   km-kurisu
/research/gat_training/          km-kurisu
/backend/path_a_symptom_image/  khandelwal10urvi
/research/cnn_training/          khandelwal10urvi
/backend/mod_c_explainer/       @teammate-3
/backend/run_pipeline.py        @teammate-3 km-kurisu
/backend/shared/                @teammate-3 nehaparab25
/frontend/                      nehaparab25
/docs/schemas/                  km-kurisu @teammate-2 @teammate-3 nehaparab25
```

## 3. Pull Request Rules

- Every PR targets `dev`, never `main`.
- PR title format: `[module] short description` — e.g. `[modb1] add tesseract OCR fallback for scanned reports`
- Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`) — fill in: what changed, which module(s), whether any JSON contract changed, how you tested it.
- If your PR touches `docs/schemas/*`, tag every owner listed for that file in CODEOWNERS and wait for their explicit approval before merging — a contract change is a breaking change for someone else's module until they've acknowledged it.
- Minimum one approval to merge into `dev`. Two approvals for anything touching `backend/run_pipeline.py`, `backend/shared/`, or `docs/schemas/`.
- Only merge `dev` → `main` at agreed checkpoints (e.g. before a demo or milestone), not continuously.

## 4. Commit Convention

Use conventional commits so history stays scannable across 4 people's work:

```
feat(modb3): add rule-based severity fallback ahead of GAT
fix(frontend): correct badge color mapping for severe band
docs(schemas): widen severity map to open string keys
research(gat): first training run on Muyama synthetic set
```

## 5. How Coding Agents Should Behave in This Repo

If you're using an agentic tool (Claude Code, Antigravity, Cursor, etc.) to do the actual implementation work, give it these constraints explicitly in its instructions/system prompt for the session:

1. **Stay inside your assigned folder.** Don't let the agent "helpfully" refactor another module's code, even if it looks related.
2. **Branch off `dev`, never commit to `main`/`dev` directly.** Have the agent create a feature branch first, always.
3. **Treat `docs/schemas/*` as read-only** unless the task explicitly is a contract-change task — and if so, the agent should flag it clearly in its output so you know to tag the other owners before merging.
4. **Open a PR, don't just push.** The agent's last step should be opening a PR against `dev` with a filled-out description, not a direct merge.
5. **Mock data first.** When building against another module's output (e.g. frontend building against Mod C, or Mod C building against Path A/B), the agent should use `backend/shared/mock_data.py` rather than waiting for the real upstream module to be finished.
6. **Never regenerate `docs/schemas/*` from your own module's code.** Schemas are the source of truth that code conforms to, not the other way around — this keeps two agents from silently drifting the contract in different directions.

## 6. CI (GitHub Actions)

Minimum `ci.yml` on every PR into `dev`:
- Python: lint (`ruff` or `flake8`) + `pytest` on `backend/` (excluding `research/`)
- Frontend: `npm run lint` + `npm run build`
- Schema check: validate `backend/shared/schemas.py` Pydantic models still match `docs/schemas/*.json` (prevents silent contract drift between a module's code and the documented contract)

## 7. First-Week Checklist (do this before writing feature code)

- [ ] Repo created, `main` + `dev` branches set up, `main` branch protection enabled (require PR + 1 review)
- [ ] `.github/CODEOWNERS` filled in with real GitHub handles
- [ ] `.github/PULL_REQUEST_TEMPLATE.md` added
- [ ] `docs/schemas/*.json` committed as the frozen v1 contracts (§7 of the PRD)
- [ ] `backend/shared/mock_data.py` generating a valid `modC_frontend_output.json` sample
- [ ] Everyone has pushed one trivial PR through the full flow (branch → PR → review → merge to `dev`) once, so the process is proven before real work starts