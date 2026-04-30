Source of truth:
- `bylaw_in.json`

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
