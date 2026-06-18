Source of truth:
- `eelulaw.pdf` (full IT bylaws, 2021)
- `bylaw_in.json` (extracted flat keys + appendix distribution)

Extraction:
- Run `python scripts/extract_eelulaw_full.py` from `GP/` to refresh `bylaw_in.json` and `chatBot/data/eelulaw/`
- Legacy `eelu.pdf` (4-page distribution only) is optional; appendix pages 31-35 of eelulaw.pdf are canonical

Generated artifacts:
- `courses.json`
- `prerequisite_graph.json`
- `policy.json`

Generation:
- Run `python -m recommendation.preprocess_bylaws`

Notes:
- The recommendation engine reads the generated files and auto-regenerates them when `bylaw_in.json` is newer.
- Prerequisite rules like `"Passing 85 Credit Hours"` are preserved in the graph.
- The API route ignores caller-provided `AllCourses` and uses the bylaw-derived catalog instead.
- Chatbot RAG sources live in `chatBot/data/eelulaw/` (rebuild with `python -m chatBot.rebuild_index`).
