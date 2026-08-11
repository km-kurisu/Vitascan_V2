# VitaScan — Nutritional Deficiency Grading & Explanation System

VitaScan is a multi-modal AI system that grades nutritional deficiency severity (iron, B12, folate, anemia) using joint reasoning across blood report biomarker data (Path B: OCR → Graph Attention Network) and optional physical symptom photographs (Path A: CNN inference). Both paths feed into an LLM-powered explanation and FSSAI diet recommendation layer, served via a Next.js web application.

---

## 🏗 System Architecture

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

---

## 📁 Repository Layout

```
vitascan/
├── .github/
│   ├── workflows/ci.yml         # GitHub Actions lint & test workflow
│   ├── CODEOWNERS               # Folder ownership definitions
│   └── PULL_REQUEST_TEMPLATE.md # Standard PR checklist
├── docs/
│   ├── PRD.md                   # Product Requirements Document
│   ├── CONTRIBUTING.md          # Multi-agent Git workflow & guidelines
│   └── schemas/                 # Canonical JSON contracts
├── backend/
│   ├── run_pipeline.py          # FastAPI orchestrator (port 8000)
│   ├── requirements.txt         # Backend Python dependencies
│   ├── .env.example             # Environment variable template
│   ├── path_b_blood_report/     # OCR -> Normalizer -> GAT grader
│   ├── path_a_symptom_image/    # Image preprocessing -> CNN -> Crosscheck
│   ├── mod_c_explainer/         # LLM explainer, FSSAI check, port 8080 server
│   └── shared/                  # Pydantic schemas & mock data generator
├── research/                    # Notebooks and dataset management
└── frontend/                    # Next.js + TypeScript + Tailwind CSS UI
```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.11**
- **Node.js 20+** and `npm`
- (Optional) **Tesseract OCR binary** on system PATH for scanned blood report support

---

### Backend Setup

1. **Navigate to the backend folder:**
   ```bash
   cd backend
   ```

2. **Create and activate a virtual environment:**
   ```bash
   python -m venv venv
   # On Windows:
   .\venv\Scripts\activate
   # On macOS/Linux:
   source venv/bin/activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up Environment Variables:**
   ```bash
   cp .env.example .env
   # Edit .env and supply your GROQ_API_KEY (optional, fallback mock exists)
   ```

5. **Run the FastAPI Orchestrator:**
   ```bash
   python run_pipeline.py
   ```
   The backend API will be live at `http://localhost:8000`.

---

### Frontend Setup

1. **Navigate to the frontend folder:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the Next.js Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

---

## 🧪 Running Tests

- **Run backend tests:**
  ```bash
  pytest backend/
  ```

- **Run schema validation check:**
  ```bash
  pytest backend/shared/test_schemas.py
  ```

---

## 👥 Multi-Agent & Team Workflow

Before making changes, please read [docs/CONTRIBUTING.md](file:///i:/Code/Vitascan_V2/docs/CONTRIBUTING.md).
- **Never commit directly to `main` or `dev`.**
- Create a feature branch: `feature/<module-shortname>-<desc>`.
- Any changes to `docs/schemas/*` require sign-off from all module owners listed in `.github/CODEOWNERS`.
