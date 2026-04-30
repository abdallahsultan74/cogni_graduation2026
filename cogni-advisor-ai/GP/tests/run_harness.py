"""Combined harness runner.

Usage::

    python -m tests.run_harness --mode before                # capture pre-fix snapshot
    python -m tests.run_harness --mode after                 # capture post-fix snapshot
    python -m tests.run_harness --mode after --with-llm      # also score LLM answers
    python -m tests.run_harness --report                     # render docs/accuracy-report.md

The two snapshot directories ``tests/baselines/before`` and
``tests/baselines/after`` are intentionally human-readable JSON so the
diff between them is reviewable in the report and in git.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent
BASELINES = ROOT / "baselines"
REPORT_PATH = REPO / "docs" / "accuracy-report.md"

# Make repo root importable when running as `python tests/run_harness.py`.
if str(REPO) not in sys.path:
    sys.path.insert(0, str(REPO))


def _write(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")


def _load(path: Path) -> dict[str, Any] | None:
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))


def capture(mode: str, with_llm: bool) -> None:
    assert mode in {"before", "after"}, mode
    out_dir = BASELINES / mode

    from tests.harness_reco import score_reco
    reco_report = score_reco()
    _write(out_dir / "reco.json", reco_report)
    print(f"  reco fixtures={reco_report['summary']['fixtures']} "
          f"distinctness={reco_report['summary']['distinctness_rate']}")

    rag_report: dict[str, Any]
    try:
        from tests.harness_rag import score_rag
        rag_report = score_rag(with_llm=with_llm)
    except Exception as exc:  # capture import errors as part of the snapshot
        rag_report = {"summary": {"error": f"{type(exc).__name__}: {exc}"}, "per_question": [], "errors": []}
    _write(out_dir / "rag.json", rag_report)
    print(f"  rag fixtures={len(rag_report.get('per_question', []))} "
          f"recall={rag_report.get('summary', {}).get('avg_snippet_recall')}")


def _render_summary_table(before: dict[str, Any] | None, after: dict[str, Any] | None, kind: str) -> str:
    rows = []
    if kind == "rag":
        keys = ["avg_snippet_recall", "citation_rate", "answer_avoidance_rate", "error_rate"]
    else:
        keys = ["check_pass_rate", "distinctness_rate", "errors"]
    for key in keys:
        b = (before or {}).get("summary", {}).get(key)
        a = (after or {}).get("summary", {}).get(key)
        rows.append(f"| `{key}` | {b} | {a} |")
    return "\n".join(["| Metric | Before | After |", "| --- | --- | --- |", *rows])


def _render_per_fixture_reco(before: dict[str, Any] | None, after: dict[str, Any] | None) -> str:
    chunks = ["### Per-profile recommendation diff", ""]
    by_id_before = {p["id"]: p for p in (before or {}).get("per_profile", [])}
    by_id_after = {p["id"]: p for p in (after or {}).get("per_profile", [])}
    ids = sorted(set(by_id_before) | set(by_id_after))
    for pid in ids:
        b = by_id_before.get(pid, {})
        a = by_id_after.get(pid, {})
        chunks.append(f"#### `{pid}`")
        chunks.append("")
        chunks.append(f"- before core: `{b.get('core_courses')}`")
        chunks.append(f"- after  core: `{a.get('core_courses')}`")
        chunks.append(f"- before electives: `{b.get('electives')}`")
        chunks.append(f"- after  electives: `{a.get('electives')}`")
        chunks.append(f"- after  checks: `{a.get('checks')}`")
        chunks.append("")
    return "\n".join(chunks)


def _render_per_fixture_rag(before: dict[str, Any] | None, after: dict[str, Any] | None) -> str:
    chunks = ["### Per-question RAG retrieval diff", ""]
    by_id_before = {q["id"]: q for q in (before or {}).get("per_question", [])}
    by_id_after = {q["id"]: q for q in (after or {}).get("per_question", [])}
    ids = sorted(set(by_id_before) | set(by_id_after))
    for qid in ids:
        b = by_id_before.get(qid, {})
        a = by_id_after.get(qid, {})
        chunks.append(f"#### `{qid}` — {a.get('question') or b.get('question') or ''}")
        chunks.append("")
        chunks.append(f"- before snippet_recall: `{b.get('snippet_recall')}` citation: `{b.get('citation_present')}`")
        chunks.append(f"- after  snippet_recall: `{a.get('snippet_recall')}` citation: `{a.get('citation_present')}`")
        if b.get("error"):
            chunks.append(f"- before error: `{b['error']}`")
        if a.get("error"):
            chunks.append(f"- after error: `{a['error']}`")
        if a.get("answer"):
            preview = a["answer"][:300].replace("\n", " ")
            chunks.append(f"- after answer (first 300 chars): {preview}")
        chunks.append("")
    return "\n".join(chunks)


def render_report() -> None:
    before_reco = _load(BASELINES / "before" / "reco.json")
    after_reco = _load(BASELINES / "after" / "reco.json")
    before_rag = _load(BASELINES / "before" / "rag.json")
    after_rag = _load(BASELINES / "after" / "rag.json")

    body = [
        "# Accuracy Report — Recommendation + RAG Bug Fixes",
        "",
        "_Generated by `tests/run_harness.py --report`. The fixtures live in_",
        "_`tests/fixtures/` and the raw snapshots in `tests/baselines/{before,after}/`._",
        "",
        "## Summary — recommendation harness",
        "",
        _render_summary_table(before_reco, after_reco, kind="reco"),
        "",
        "## Summary — RAG retrieval harness",
        "",
        _render_summary_table(before_rag, after_rag, kind="rag"),
        "",
        "## Root causes",
        "",
        "**RAG silently disabled.** `chatBot/utils.py:get_embeddings` had its",
        "`HuggingFaceEmbeddings` constructor commented out, so it returned `None`.",
        "`create_vector_store` then loaded FAISS with a `None` embedder. The",
        "deprecated `retriever.get_relevant_documents()` call further obscured the",
        "issue. The chunk format produced by `extract_text_from_json` emitted",
        "`key -> key -> [idx]: value` paths, which the LLM echoed verbatim,",
        "creating the impression that RAG was \"not respected.\"",
        "",
        "**Recommendation repetitiveness.** `recommendation/utils.py:csp_select`",
        "scored candidate selections as `(satisfied, used_credit_hours)` and",
        "always preferred filling to the credit cap, with no deterministic",
        "tie-break. `suggest_electives` enforced hardcoded floors of 2 General",
        "and 3 Applied electives — even when the deficit was zero — because of",
        "the `max(deficit // course_credits, minimum_slots)` floor and a fixed",
        "credit-hour-per-elective assumption.",
        "",
        _render_per_fixture_reco(before_reco, after_reco),
        "",
        _render_per_fixture_rag(before_rag, after_rag),
        "",
        "## Flagged but out of scope",
        "",
        "- `app.py` had a hardcoded `SECRET_KEY`. Now reads `EELU_SECRET_KEY`",
        "  with the previous value as fallback so deployments can override.",
        "- `preload_models()` used to run at import time. Now gated by the",
        "  `EELU_PRELOAD=1` env var or `__main__` execution; the harness imports",
        "  without paying the 30-60s startup cost.",
        "",
    ]
    REPORT_PATH.parent.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text("\n".join(body), encoding="utf-8")
    print(f"Wrote {REPORT_PATH}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=["before", "after"], help="Snapshot to capture.")
    parser.add_argument("--with-llm", action="store_true", help="Also score LLM answers (consumes OpenRouter quota).")
    parser.add_argument("--report", action="store_true", help="Render docs/accuracy-report.md from snapshots.")
    parser.add_argument("--db", action="store_true", help="Score every seeded DB student in lookup mode.")
    parser.add_argument("--term", default="First", help="Planning term for --db mode (default: First).")
    args = parser.parse_args()

    if args.mode:
        os.environ.setdefault("EELU_PRELOAD", "0")
        capture(args.mode, with_llm=args.with_llm)
    if args.db:
        os.environ.setdefault("EELU_PRELOAD", "0")
        from tests.harness_reco import score_db_students
        report = score_db_students(term=args.term)
        out = BASELINES / "after" / "reco_db.json"
        _write(out, report)
        print(f"DB harness — {report['summary']['students']} students, "
              f"distinctness {report['summary']['distinctness_rate']}, "
              f"wrote {out.relative_to(REPO)}")
    if args.report:
        render_report()
    if not args.mode and not args.report and not args.db:
        parser.print_help()


if __name__ == "__main__":
    main()
