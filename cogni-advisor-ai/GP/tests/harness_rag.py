"""RAG accuracy harness — retrieval scoring (no LLM required by default).

Run via tests/run_harness.py. This module exposes :func:`score_rag` which
loads the fixtures, calls ``chatBot.utils.retrieve_context`` for each
question, and reports per-question pass/fail. LLM-based answer scoring is
opt-in (``with_llm=True``) so the retrieval step can be iterated on
without spending OpenRouter quota.
"""
from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "rag_questions.json"


def _load_fixtures() -> list[dict[str, Any]]:
    with FIXTURES.open(encoding="utf-8") as handle:
        return json.load(handle)


def _retrieved_text(chunks: list[dict[str, Any]]) -> str:
    return "\n\n".join(chunk.get("content", "") for chunk in chunks)


def _retrieved_sources(chunks: list[dict[str, Any]]) -> list[str]:
    return [str(chunk.get("source") or "") for chunk in chunks]


def _score_single(fixture: dict[str, Any], chunks: list[dict[str, Any]], answer: str | None) -> dict[str, Any]:
    text = _retrieved_text(chunks).lower()
    sources = " | ".join(_retrieved_sources(chunks)).lower()

    snippet_hits = [snippet for snippet in fixture["expected_snippets"] if snippet.lower() in text]
    citation_hits = [cite for cite in fixture["expected_citations"] if cite.lower() in sources or cite.lower() in text]

    result = {
        "id": fixture["id"],
        "question": fixture["question"],
        "retrieved_count": len(chunks),
        "retrieved_preview": _retrieved_text(chunks)[:300],
        "snippet_recall": len(snippet_hits) / max(len(fixture["expected_snippets"]), 1),
        "snippet_hits": snippet_hits,
        "citation_present": bool(citation_hits),
        "citations_found": citation_hits,
    }

    if answer is not None:
        result["answer"] = answer
        # An LLM error string is not a real answer — count it as a failure
        # so error_rate is reflected in the summary instead of inflating the
        # avoidance rate.
        is_error = answer.startswith("LLM Error") or answer.startswith("LLM_ERROR")
        if is_error:
            result["answer_error"] = answer
            result["answer_avoids_must_not"] = False
        else:
            result["answer_avoids_must_not"] = not any(
                forbidden.lower() in answer.lower() for forbidden in fixture.get("must_not_contain", [])
            )

    return result


def score_rag(*, with_llm: bool = False) -> dict[str, Any]:
    """Score each fixture and return a combined report."""
    from chatBot.utils import retrieve_context  # imported lazily so harness can run with stale code

    fixtures = _load_fixtures()
    per_question: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for fixture in fixtures:
        try:
            chunks = retrieve_context(fixture["question"], k=8)
        except Exception as exc:  # capture the broken-state error for the BEFORE baseline
            errors.append({"id": fixture["id"], "error": f"{type(exc).__name__}: {exc}"})
            per_question.append({
                "id": fixture["id"],
                "question": fixture["question"],
                "retrieved_count": 0,
                "retrieved_preview": "",
                "snippet_recall": 0.0,
                "snippet_hits": [],
                "citation_present": False,
                "citations_found": [],
                "error": f"{type(exc).__name__}: {exc}",
            })
            continue

        answer = None
        if with_llm:
            try:
                from chatBot.utils import process_query
                answer = process_query(fixture["question"])
            except Exception as exc:
                answer = f"LLM_ERROR: {type(exc).__name__}: {exc}"

        per_question.append(_score_single(fixture, chunks, answer))

    total = len(per_question)
    avg_recall = sum(q.get("snippet_recall", 0) for q in per_question) / max(total, 1)
    citation_rate = sum(1 for q in per_question if q.get("citation_present")) / max(total, 1)
    answer_rate = (
        sum(1 for q in per_question if q.get("answer_avoids_must_not")) / max(total, 1)
        if with_llm
        else None
    )
    error_rate = sum(1 for q in per_question if "error" in q) / max(total, 1)

    return {
        "summary": {
            "fixtures": total,
            "avg_snippet_recall": round(avg_recall, 4),
            "citation_rate": round(citation_rate, 4),
            "answer_avoidance_rate": round(answer_rate, 4) if answer_rate is not None else None,
            "error_rate": round(error_rate, 4),
            "with_llm": with_llm,
        },
        "per_question": per_question,
        "errors": errors,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--with-llm", action="store_true", help="Also score LLM answers (consumes OpenRouter quota).")
    parser.add_argument("--out", type=Path, help="Write JSON report to this path instead of stdout.")
    args = parser.parse_args()

    os.environ.setdefault("EELU_PRELOAD", "0")
    logging.basicConfig(level=logging.INFO)
    report = score_rag(with_llm=args.with_llm)
    text = json.dumps(report, indent=2, ensure_ascii=False)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
        print(f"Wrote {args.out}")
    else:
        print(text)
