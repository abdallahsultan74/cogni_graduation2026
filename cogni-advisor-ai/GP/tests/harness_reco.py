"""Recommendation accuracy harness — fixture-driven scoring.

Runs each profile through ``AcademicAdvisor.run`` and scores against the
fixture's ``expected`` block. The most important metric is *distinctness*:
two student profiles that share no expected overlap must produce
different ``core_courses`` sets. Repetitive output across profiles is the
defect this harness exists to catch.
"""
from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

FIXTURES = Path(__file__).resolve().parent / "fixtures" / "student_profiles.json"


def _load_fixtures() -> list[dict[str, Any]]:
    with FIXTURES.open(encoding="utf-8") as handle:
        return json.load(handle)


def _run_one(profile: dict[str, Any]) -> dict[str, Any]:
    from recommendation.utils import AcademicAdvisor  # lazy import for harness portability

    inp = profile["input"]
    advisor = AcademicAdvisor(
        student_id=inp["student_id"],
        gpa=inp["gpa"],
        expected_to_graduate=inp["expected_to_graduate"],
        semester=inp["semester"],
        term=inp["term"],
        department=inp["department"],
        completed_course_details=inp["completed_course_details"],
    )
    return advisor.run()


def _course_code(item: Any) -> str:
    if isinstance(item, dict):
        return str(item.get("code", ""))
    return str(item)


def _score_one(profile: dict[str, Any], result: dict[str, Any]) -> dict[str, Any]:
    expected = profile.get("expected", {}) or {}
    core_raw = result.get("core_courses") or result.get("core_course_codes") or []
    core = [_course_code(item) for item in core_raw]
    core_set = set(core)
    summary = result.get("student_summary", {}) or {}
    electives = result.get("electives", {}) or {}

    checks: dict[str, Any] = {}

    if "academic_level" in expected:
        checks["academic_level"] = summary.get("AcademicLevel") == expected["academic_level"]

    if "academic_level_in" in expected:
        checks["academic_level_in"] = summary.get("AcademicLevel") in expected["academic_level_in"]

    if "credit_limit_max" in expected:
        checks["credit_limit_max"] = summary.get("CreditLimit", 0) <= expected["credit_limit_max"]

    if "must_not_recommend" in expected:
        forbidden = set(expected["must_not_recommend"])
        intersection = core_set & forbidden
        checks["must_not_recommend"] = not intersection
        checks["must_not_recommend_violations"] = sorted(intersection)

    if "must_not_recommend_categories" in expected:
        forbidden_cats = set(expected["must_not_recommend_categories"])
        # We need to look up category for each recommended code — fetch from courses.json.
        violations = _category_violations(core, forbidden_cats)
        checks["must_not_recommend_categories"] = not violations
        checks["must_not_recommend_categories_violations"] = violations

    return {
        "id": profile["id"],
        "core_courses": core,
        "credit_limit": summary.get("CreditLimit"),
        "academic_level": summary.get("AcademicLevel"),
        "total_core_credits": result.get("total_core_credits"),
        "electives": {
            "Applied": electives.get("Applied"),
            "General": electives.get("General"),
            "TotalElectives": electives.get("TotalElectives"),
            "UsedElectiveCredits": electives.get("UsedElectiveCredits"),
        },
        "ineligible_count": len(result.get("ineligible_courses", []) or []),
        "checks": checks,
    }


def _category_violations(core: list[str], forbidden_cats: set[str]) -> list[str]:
    courses_path = Path(__file__).resolve().parents[1] / "recommendation" / "data" / "courses.json"
    if not courses_path.exists():
        return []
    with courses_path.open(encoding="utf-8") as handle:
        catalog = {c["code"]: c for c in json.load(handle)}
    return [code for code in core if catalog.get(code, {}).get("distribution_category") in forbidden_cats]


def _distinctness_check(scored: list[dict[str, Any]], fixtures: list[dict[str, Any]]) -> dict[str, Any]:
    by_id = {entry["id"]: set(_course_code(c) for c in entry.get("core_courses", [])) for entry in scored}
    pairs_evaluated = 0
    pairs_distinct = 0
    failures: list[dict[str, Any]] = []

    for fixture in fixtures:
        a_id = fixture["id"]
        peers = (fixture.get("expected") or {}).get("must_be_distinct_from") or []
        for b_id in peers:
            if a_id not in by_id or b_id not in by_id:
                continue
            pairs_evaluated += 1
            if by_id[a_id] != by_id[b_id]:
                pairs_distinct += 1
            else:
                failures.append({"a": a_id, "b": b_id, "core_courses": sorted(by_id[a_id])})

    return {
        "pairs_evaluated": pairs_evaluated,
        "pairs_distinct": pairs_distinct,
        "distinctness_rate": round(pairs_distinct / pairs_evaluated, 4) if pairs_evaluated else None,
        "failures": failures,
    }


def _run_db_student(student_id: str, term: str = "First", semester: str = "regular") -> dict[str, Any]:
    """Run the full lookup pipeline against the seed DB for one student."""
    from recommendation import repository
    from recommendation.utils import AcademicAdvisor

    student = repository.find_student(student_id)
    if student is None:
        raise LookupError(f"No seeded student with id {student_id}")
    adv_input = repository.build_advisor_input(student)
    advisor = AcademicAdvisor(
        adv_input["student_id"],
        adv_input["gpa"],
        adv_input["expected_to_graduate"],
        semester,
        term,
        adv_input["department"],
        completed_course_details=adv_input["completed_course_details"],
    )
    return advisor.run()


def score_db_students(term: str = "First") -> dict[str, Any]:
    """Score every seeded student in DB-lookup mode and report distinctness."""
    from recommendation import repository

    students = repository.list_sample_students()
    per_student: list[dict[str, Any]] = []
    for s in students:
        try:
            result = _run_db_student(s["student_id"], term=term)
        except Exception as exc:
            per_student.append({"id": s["student_id"], "error": f"{type(exc).__name__}: {exc}", "core_courses": []})
            continue
        summary = result.get("student_summary", {}) or {}
        per_student.append({
            "id": s["student_id"],
            "name": s["name"],
            "department": summary.get("department"),
            "level": summary.get("academic_level"),
            "gpa": summary.get("gpa"),
            "completed_hours": summary.get("total_completed_hours"),
            "credit_limit": summary.get("credit_limit"),
            "core_courses": [_course_code(c) for c in (result.get("core_courses") or [])],
            "ineligible_count": len(result.get("ineligible_courses") or []),
        })

    sets = [set(entry["core_courses"]) for entry in per_student if "error" not in entry]
    pairs = max(len(sets) * (len(sets) - 1) // 2, 1)
    distinct_pairs = sum(1 for i in range(len(sets)) for j in range(i + 1, len(sets)) if sets[i] != sets[j])
    return {
        "summary": {
            "students": len(per_student),
            "errors": sum(1 for e in per_student if "error" in e),
            "pairs": pairs,
            "distinct_pairs": distinct_pairs,
            "distinctness_rate": round(distinct_pairs / pairs, 4),
            "term": term,
        },
        "per_student": per_student,
    }


def score_reco() -> dict[str, Any]:
    fixtures = _load_fixtures()
    scored: list[dict[str, Any]] = []
    raw_results: list[dict[str, Any]] = []
    errors: list[dict[str, Any]] = []

    for fixture in fixtures:
        try:
            result = _run_one(fixture)
        except Exception as exc:
            errors.append({"id": fixture["id"], "error": f"{type(exc).__name__}: {exc}"})
            scored.append({
                "id": fixture["id"],
                "core_courses": [],
                "checks": {},
                "error": f"{type(exc).__name__}: {exc}",
            })
            raw_results.append({"id": fixture["id"], "error": str(exc)})
            continue
        scored.append(_score_one(fixture, result))
        raw_results.append({"id": fixture["id"], "result": result})

    distinctness = _distinctness_check(scored, fixtures)

    total_checks = sum(
        sum(1 for k, v in (entry.get("checks") or {}).items() if isinstance(v, bool))
        for entry in scored
    )
    passed_checks = sum(
        sum(1 for k, v in (entry.get("checks") or {}).items() if v is True)
        for entry in scored
    )

    return {
        "summary": {
            "fixtures": len(fixtures),
            "errors": len(errors),
            "checks_total": total_checks,
            "checks_passed": passed_checks,
            "check_pass_rate": round(passed_checks / total_checks, 4) if total_checks else None,
            "distinctness_rate": distinctness["distinctness_rate"],
        },
        "distinctness": distinctness,
        "per_profile": scored,
        "raw_results": raw_results,
        "errors": errors,
    }


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("--out", type=Path, help="Write JSON report to this path instead of stdout.")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO)
    report = score_reco()
    text = json.dumps(report, indent=2, ensure_ascii=False)
    if args.out:
        args.out.parent.mkdir(parents=True, exist_ok=True)
        args.out.write_text(text, encoding="utf-8")
        print(f"Wrote {args.out}")
    else:
        print(text)
