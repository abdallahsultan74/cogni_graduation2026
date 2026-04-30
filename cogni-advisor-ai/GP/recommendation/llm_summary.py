"""LLM-generated headline summary for a recommendation result.

Takes the deterministic CSP output and asks Gemini/OpenRouter to write a
2-3 paragraph plain-English brief. Caches by content hash so identical
results don't re-bill on every page render.
"""
from __future__ import annotations

import hashlib
import json
import logging
from typing import Any

from llm_client import call_llm, is_llm_configured

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """\
You are an academic advisor for the EELU IT/AI Bachelor's program. You are given a
structured analysis of a single student's academic state and the recommendation
engine's suggestions for the upcoming term. Produce a brief headline summary the
student can read at a glance.

Strict rules:
1. Two short paragraphs maximum. ~80 words total.
2. Lead with the student's overall situation (level, GPA, term, what's happening this term).
3. Be specific: name course codes, credit hours, and concrete deficits the student should care about.
4. Surface concerns without alarmism: blocked mandatory courses, GPA-related caps, sparse term offerings, near-graduation milestones.
5. End with a single concrete next-step suggestion.
6. No bullet lists. Prose only.
7. No saccharine filler ("great job!", "you're doing amazing", etc.).
8. Do not repeat data verbatim — the dashboard already shows it. Add interpretation that the data alone doesn't convey.
9. Address the student in second person ("you").
10. If the data shows zero core recommendations, explain WHY in one clause (e.g., "because every first-term mandatory is either completed or blocked"), don't just say there's nothing.
"""


def _cache_key(payload: dict[str, Any]) -> str:
    blob = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha1(blob).hexdigest()


_summary_cache: dict[str, str] = {}


def _build_brief(result: dict[str, Any], term: str) -> dict[str, Any]:
    """Compact view of the result for the LLM — strip noise + verbose lists."""
    summary = result.get("student_summary", {}) or {}
    electives = result.get("electives", {}) or {}
    coming = (result.get("coming_next_term") or {})
    outside = result.get("outside_dept") or {}

    def _codes(items, key="code"):
        return [item.get(key) for item in (items or []) if item.get(key)]

    return {
        "student": {
            "id": summary.get("student_id"),
            "name": summary.get("name"),
            "level": summary.get("academic_level"),
            "department": summary.get("department"),
            "gpa": summary.get("gpa"),
            "completed_hours": summary.get("total_completed_hours"),
            "remaining_hours": summary.get("total_remaining"),
            "credit_cap_this_term": summary.get("credit_limit"),
        },
        "planning": {
            "term": term,
        },
        "this_term": {
            "core_courses": [
                {"code": c.get("code"), "name": c.get("course_name"), "hrs": c.get("credit_hours")}
                for c in (result.get("core_courses") or [])
            ],
            "core_total_hrs": result.get("total_core_credits", 0),
            "general_elective_slots": electives.get("General"),
            "general_options": _codes(electives.get("GeneralOptions")),
            "applied_elective_slots": electives.get("Applied"),
            "applied_options": _codes(electives.get("AppliedOptions")),
            "outside_dept_slots_left": outside.get("can_take_outside") if outside else 0,
            "outside_options": _codes(outside.get("available_outside")) if outside else [],
        },
        "next_term": {
            "term": coming.get("term"),
            "courses": [
                {"code": c.get("code"), "name": c.get("course_name"), "hrs": c.get("credit_hours")}
                for c in (coming.get("courses") or [])
            ],
        },
        "blocked": [
            {"code": c.get("code"), "name": c.get("course_name"), "needs": c.get("missing_prereqs")}
            for c in (result.get("ineligible_courses") or [])
        ],
        "deficits": result.get("remaining_requirements", {}),
    }


def summarize_recommendation(result: dict[str, Any], term: str) -> dict[str, Any]:
    """Return ``{"summary": str, "source": "llm"|"fallback"|"error", "model": str|None}``.

    Falls back to a deterministic one-liner if no API key is configured or
    the LLM call fails — the page never shows an error in this card.
    """
    brief = _build_brief(result, term)

    if not is_llm_configured():
        return {
            "summary": _fallback_summary(brief),
            "source": "fallback",
            "model": None,
        }

    cache_key = _cache_key(brief)
    cached = _summary_cache.get(cache_key)
    if cached:
        return {"summary": cached, "source": "llm", "model": "cached"}

    user_prompt = (
        "Write a brief advisor summary for this student. "
        "The structured analysis below is the entire dataset to use:\n\n"
        f"{json.dumps(brief, indent=2, ensure_ascii=False)}"
    )

    answer = call_llm(user_prompt, SYSTEM_PROMPT, temperature=0.3, max_tokens=500)
    if answer.startswith("LLM Error"):
        logger.warning("Advisor summary LLM call failed: %s", answer)
        return {
            "summary": _fallback_summary(brief),
            "source": "error",
            "model": None,
            "error": answer,
        }

    cleaned = answer.strip()
    _summary_cache[cache_key] = cleaned
    if len(_summary_cache) > 200:
        # cheap eviction — drop oldest entries by re-creating the dict
        _summary_cache.pop(next(iter(_summary_cache)))
    return {"summary": cleaned, "source": "llm", "model": "gemini-or-openrouter"}


def _fallback_summary(brief: dict[str, Any]) -> str:
    """Deterministic fallback when the LLM is unavailable."""
    s = brief["student"]
    t = brief["this_term"]
    n = brief["next_term"]
    bits: list[str] = []
    bits.append(
        f"You're at {s['level']} with a {s['gpa']} GPA "
        f"({s['completed_hours']} of {s['completed_hours'] + s['remaining_hours']} credits done)."
    )
    if t["core_courses"]:
        codes = ", ".join(c["code"] for c in t["core_courses"])
        bits.append(f"Mandatory this term: {codes} ({t['core_total_hrs']} hrs).")
    else:
        bits.append("No mandatory course is available for you to register for in this term.")
    elective_slots = (t.get("general_elective_slots") or 0) + (t.get("applied_elective_slots") or 0)
    if elective_slots:
        bits.append(f"You have {elective_slots} elective slot{'s' if elective_slots != 1 else ''} to fill.")
    if n["courses"]:
        bits.append(f"{len(n['courses'])} mandatory course{'s' if len(n['courses']) != 1 else ''} are queued for {n['term']} term.")
    if brief["blocked"]:
        blocked_codes = ", ".join(b["code"] for b in brief["blocked"])
        bits.append(f"Blocked: {blocked_codes}.")
    return " ".join(bits)
