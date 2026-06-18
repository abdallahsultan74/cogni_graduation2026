# HOW.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Flask-based **Academic Advisor System** for EELU (Egyptian E-Learning University) Bachelor of Information Technology / AI program. Three cooperating subsystems share one Flask app:

- **`chatBot/`** — RAG Q&A over the bylaws using LangChain + FAISS + HuggingFace embeddings (`BAAI/bge-base-en-v1.5`) + Gemini (default) or OpenRouter LLM.
- **`recommendation/`** — Constraint-satisfaction course recommender. Two entry modes: **lookup** (by Student ID, pulls everything from SQLite) and **what-if** (manual entry, for unknown students).
- **`recommendation/data/students.db`** — SQLite student registry; rebuilt from `students.seed.json` on first request.

## Common Commands

```bash
# Bootstrap a fresh venv
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Run the app on port 5050 (avoiding macOS AirPlay on 5000)
python run_app.py            # convenience launcher; sets EELU_PRELOAD=1

# Custom host/port
EELU_PORT=8080 python run_app.py

# Regenerate the recommendation catalog (courses.json, prerequisite_graph.json, policy.json)
python -m recommendation.preprocess_bylaws

# Reseed the student DB from students.seed.json
python -m recommendation.db reseed
python -m recommendation.db dump 20210525   # inspect one student's DB record

# Rebuild the chatbot FAISS index after changing source docs or embedding model
python -m chatBot.rebuild_index

# Test harness — fixtures + DB-mode + accuracy report
python tests/run_harness.py --mode after            # snapshot RAG + reco fixtures
python tests/run_harness.py --mode after --with-llm # also score LLM answers (uses Gemini)
python tests/run_harness.py --db                    # score every seeded DB student
python tests/run_harness.py --report                # render docs/accuracy-report.md
```

### Required environment variables

LLM key (one of these — Gemini preferred):
- `GEMINI_API_KEY` — preferred provider; default model is `gemini-flash-latest`.
- `OPENROUTER_API_KEY` — fallback; default model is `deepseek/deepseek-chat-v3.1:free`.
- `LLM_PROVIDER=gemini|openrouter` — explicit override; otherwise auto-detected by which key is set.

Other:
- `EELU_PRELOAD=1` — preload embeddings + FAISS at app import; otherwise lazy. `run_app.py` sets this automatically.
- `EELU_PORT`, `EELU_HOST` — server bind (default `5050` / `0.0.0.0`).
- `EELU_SECRET_KEY` — Flask session key; defaults to a hardcoded dev value.
- `EELU_EMBEDDING_MODEL` — override the embedding model (default `BAAI/bge-base-en-v1.5`); changing this requires `python -m chatBot.rebuild_index`.

`.env` at the repo root is loaded automatically (via `python-dotenv`) so the keys can live in a single file.

### Endpoints

- `GET /` — landing page
- `GET/POST /chatbot/chatbot` — chat UI
- `POST /chatbot/api/ask` — JSON `{question}` → `{answer}`
- `GET/POST /recommendation/` — recommendation form (default = lookup mode; what-if mode is a toggle)
- `POST /recommendation/api/recommend` — JSON payload, identical contract to before
- `GET /recommendation/api/recommend/demo` — runs the hardcoded demo payload
- `GET /recommendation/api/policy` — exposes level thresholds, GPA bands, credit caps so the form widget never hardcodes them
- `GET /recommendation/api/students` — lists seeded students for the sample-IDs panel

## Architecture

### App entrypoint (`app.py`)

`app.py` registers two blueprints (`/chatbot`, `/recommendation`). `preload_models()` runs only when `EELU_PRELOAD=1` or when `app.py` is the main script — so the test harness and `pytest` can import without paying the 30-60s startup cost.

### Recommendation: lookup mode (the new default)

```
Student ID  ──┐
              ├──► repository.find_student(id)
              │       └──► db.connect() → SELECT * FROM students/enrollments
              │
              ├──► repository.build_advisor_input(student)
              │       ├──► compute_gpa(enrollments, catalog)        # bylaw grade scale
              │       ├──► determine_level(total_completed_hours)   # policy thresholds
              │       ├──► to_completed_course_details(enrollments) # pass-only adapter
              │       └──► derive_expected_to_graduate(...)         # auto from credits
              │
              └──► AcademicAdvisor(...)
                      └──► run() → JSON for the bento dashboard
```

The user provides only `student_id` + planning `term`. Everything else (department, GPA, completed courses, level, expected_to_graduate) is derived from the DB and the bylaw policy.

### Recommendation: SQLite schema

```sql
CREATE TABLE students (
    student_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT CHECK(department IN ('IT','AI','null')),
    enrolled_year INTEGER
);

CREATE TABLE enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT REFERENCES students,
    course_code TEXT,                    -- catalog code, e.g. "MA111"
    grade TEXT,                          -- A+, A, B+, ..., F per bylaw scale
    term_taken TEXT CHECK(term_taken IN ('First','Second','Summer')),
    year_taken INTEGER,
    is_retake INTEGER,
    UNIQUE(student_id, course_code, year_taken, term_taken)
);
```

**No derived fields are stored** (no `gpa`, no `total_credits`, no `level`). All of those are computed on read from `enrollments` + the catalog so they cannot drift.

`students.seed.json` is the source of truth — `students.db` is gitignored and rebuilt from the seed on first request via `db.ensure_seeded()`.

Sample IDs that ship in the seed: `20180078` (4th-yr IT), `20180099` (4th-yr AI), `20190042` (3rd-yr IT), `20200015` (2nd-yr IT), `20210001` (1st-yr low-GPA), `20210525` (1st-yr demo).

### Recommendation: catalog pipeline

1. **`eelulaw.pdf`** — full IT bylaws (2021); extracted via `python scripts/extract_eelulaw_full.py` into **`recommendation/data/bylaw_in.json`** and **`chatBot/data/eelulaw/`** for RAG.
2. **`preprocess_bylaws.py`** parses the flat keys into `courses.json`, `prerequisite_graph.json`, `policy.json`. Appendix pages 31–35 define semester distribution; Article 16 tables define category codes.
3. **`ensure_preprocessed_data()`** auto-regenerates artifacts whenever `bylaw_in.json` is newer than any output.
4. **`AcademicAdvisor.run()`** orchestrates filtering → eligibility → deficit-driven CSP → core + electives → topological sort → JSON output.

### Recommendation: CSP scoring

`csp_select` scores a candidate selection as `(satisfied, -gap_to_cap, sorted_codes)`:
- maximize categories whose deficit drops to zero,
- then minimize gap-to-credit-cap (closer is better, never over),
- then deterministic lexicographic tie-break by sorted course codes.

This makes identical inputs reproducible AND distinct students produce distinct selections.

### Recommendation: GPA caps

`determine_credit_limit(gpa, expected_to_graduate, semester, remaining, policy)` applies the bylaw GPA bands:
- GPA ≤ 1.0 → 12 hrs
- 1.0 < GPA < 2.0 → 15 hrs
- GPA ≥ 2.0 → semester max (18 regular, 9 summer)
- `expected_to_graduate` raises the cap to the graduation-approval limit (21 / 12).

Bands live in `policy.json:gpa_credit_caps` and use either `min_gpa` (inclusive) or `min_gpa_exclusive` for boundary handling. Same for `max_gpa_inclusive` / `max_gpa_exclusive`.

### Chatbot pipeline

1. `preload_models()` warms three module-level singletons in `chatBot/utils.py`: `_embeddings` (BGE base), `_vector_store` (FAISS), `_retriever` (k=8).
2. `create_vector_store()` writes/reads at `bylaws_vector_index/`. RAG sources: `chatBot/data/eelulaw/` (run `python scripts/extract_eelulaw_full.py` then `python -m chatBot.rebuild_index` after bylaw updates). Legacy JSON in `chatBot/data/_archive/` is excluded from indexing.
3. `retrieve_context(query, k=8)` returns retrieved chunks **without** calling the LLM (lets the harness score retrieval offline).
4. `process_query(query)` retrieves chunks, stuffs them into the strict-grounding prompt at `chatBot/prompts/system_prompt.txt`, and calls `call_llm_cached(question, context)`.
5. The LLM cache key is `(question, sha1(context))` — a stale-context answer cannot poison a fresh retrieval. Call `clear_llm_cache()` after rebuilding the index.
6. `call_llm` auto-routes to Gemini or OpenRouter based on which API key is set. Both error responses are scrubbed to redact the key.

## Conventions specific to this repo

- **Term values are lists**, not scalars. Always normalize via `normalize_term_values()`.
- **Department `"null"` is a sentinel string**, not Python `None`.
- **Distribution keys are composite for split categories**: `"General_Requirements - Mandatory"` and `"General_Requirements - Elective"` are distinct deficit buckets.
- **Result schema returns both snake_case and PascalCase student-summary keys** for back-compat (the inline JSON API used PascalCase before; the new template uses snake_case).
- `core_courses` is now a list of course objects (`{code, course_name, credit_hours, distribution_category, type, level}`), not a list of code strings. `core_course_codes` is the legacy plain-string list.
- The Flask `SECRET_KEY` defaults to a hardcoded dev value; set `EELU_SECRET_KEY` in production.

## Out-of-scope flags

- **Auth**: anyone can look up any student ID. Fine for the demo. Add session-based auth before any non-local deployment.
- **Course `level` field grouping**: surfaced in the what-if mode's multi-select widget, not yet used for scoring or filtering anywhere else.
- **Catalog density**: only IT and AI department-specific specialization courses exist in `courses.json`. CS/IS/DS were removed from the form because they had zero supporting catalog content.
