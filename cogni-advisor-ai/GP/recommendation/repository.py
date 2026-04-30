"""Read-only access to the student DB + GPA computation.

This is the *only* module that combines DB rows with the catalog. Anything
else should call ``find_student`` and treat the returned dataclass as the
single source of truth for a student's state.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

from . import db
from .utils import determine_level, fetch_all_courses, load_policy

logger = logging.getLogger(__name__)

# Bylaw grade scale (Rules For general (1).json → "Calculations of grades and GPA")
GRADE_POINTS: dict[str, float] = {
    "A+": 4.0, "A": 3.7, "B+": 3.3, "B": 3.0, "C+": 2.7, "C": 2.4,
    "D+": 2.2, "D": 2.0, "F": 0.0,
}


@dataclass(frozen=True)
class Enrollment:
    course_code: str
    grade: str
    term_taken: str
    year_taken: int
    is_retake: bool


@dataclass(frozen=True)
class Student:
    student_id: str
    name: str
    department: str
    enrolled_year: int
    enrollments: tuple[Enrollment, ...] = field(default_factory=tuple)


def _row_to_enrollment(row) -> Enrollment:
    return Enrollment(
        course_code=row["course_code"],
        grade=row["grade"],
        term_taken=row["term_taken"],
        year_taken=int(row["year_taken"]),
        is_retake=bool(row["is_retake"]),
    )


def find_student(student_id: str) -> Student | None:
    """Return a Student or None. Triggers the lazy seed on first call."""
    db.ensure_seeded()
    conn = db.connect()
    try:
        student_row = conn.execute(
            "SELECT * FROM students WHERE student_id = ?", (student_id,)
        ).fetchone()
        if not student_row:
            return None
        rows = conn.execute(
            "SELECT * FROM enrollments WHERE student_id = ? ORDER BY year_taken, term_taken, course_code",
            (student_id,),
        ).fetchall()
        return Student(
            student_id=student_row["student_id"],
            name=student_row["name"],
            department=student_row["department"],
            enrolled_year=int(student_row["enrolled_year"]),
            enrollments=tuple(_row_to_enrollment(row) for row in rows),
        )
    finally:
        conn.close()


def list_sample_students() -> list[dict[str, Any]]:
    """Tiny summary list for the empty-state hint in the UI."""
    db.ensure_seeded()
    return [
        {
            "student_id": row["student_id"],
            "name": row["name"],
            "department": row["department"],
        }
        for row in db.all_students()
    ]


def _passing(grade: str) -> bool:
    return grade in GRADE_POINTS and grade != "F"


def _latest_attempts(enrollments: tuple[Enrollment, ...]) -> dict[str, Enrollment]:
    """Return the latest attempt per course, keyed by course_code.

    Bylaw rule (Course Repetition Policy, rule_id 8): a failed course
    must be retaken; the GPA uses the *actual* grade, but the recorded
    transcript caps at D+. We treat the most recent attempt as the
    authoritative grade for GPA — passing retakes overwrite the failed
    attempt, which matches the registrar's behavior.
    """
    by_code: dict[str, Enrollment] = {}
    for enrollment in enrollments:
        existing = by_code.get(enrollment.course_code)
        if existing is None or (enrollment.year_taken, enrollment.term_taken) > (existing.year_taken, existing.term_taken):
            by_code[enrollment.course_code] = enrollment
    return by_code


def compute_gpa(enrollments: tuple[Enrollment, ...], catalog_by_code: dict[str, dict[str, Any]]) -> float:
    """Cumulative GPA per the bylaw formula.

    GPA = Σ(grade_points × credit_hours) / Σ(credit_hours).
    Includes both passed and failed *latest* attempts (passing the F
    means it gets overwritten by the retake; otherwise the F counts).
    Courses absent from the catalog are skipped — defensive against
    stale enrollments after a catalog edit.
    """
    latest = _latest_attempts(enrollments)
    total_points = 0.0
    total_hours = 0
    for code, enrollment in latest.items():
        course = catalog_by_code.get(code)
        if not course:
            continue
        credits = int(course.get("credit_hours", 0))
        if credits <= 0:
            continue
        points = GRADE_POINTS.get(enrollment.grade, 0.0)
        total_points += points * credits
        total_hours += credits
    if total_hours == 0:
        return 0.0
    return round(total_points / total_hours, 2)


def to_completed_course_details(student: Student, catalog_by_code: dict[str, dict[str, Any]]) -> list[dict[str, Any]]:
    """Adapt DB enrollments to the dict shape ``AcademicAdvisor`` accepts.

    Only passed courses count toward credits earned; failed-and-not-retaken
    enrollments are excluded so prereq checks don't accept them.
    """
    latest = _latest_attempts(student.enrollments)
    completed: list[dict[str, Any]] = []
    for code, enrollment in latest.items():
        if not _passing(enrollment.grade):
            continue
        course = catalog_by_code.get(code)
        if not course:
            continue
        completed.append({
            "code": course["code"],
            "course_name": course.get("course_name", course["code"]),
            "credit_hours": int(course.get("credit_hours", 0)),
            "distribution_category": course.get("distribution_category", ""),
            "type": course.get("type", "Mandatory"),
            "prerequisites": list(course.get("prerequisites", [])),
            "Term": list(course.get("Term", [])),
            "department": course.get("department", "null"),
        })
    return completed


# Ordering of regular-academic terms within a year. Summer is non-regular —
# it sits between Second and the next year's First, so a student who took
# only Summer doesn't advance the academic-year counter.
_TERM_ORDER = {"First": 1, "Second": 2}


def next_planning_term(enrollments: tuple[Enrollment, ...]) -> dict[str, Any]:
    """Return the term the student should be planning *next*.

    Uses the most recent regular enrollment (First/Second). Summer
    enrollments don't change the next-term flow because they're optional
    and sit between Second and First-of-next-year.

    Returns ``{"term": "First"|"Second", "year": int, "reason": str}``.
    Defaults to ``{"term": "First", "year": <current year>, ...}`` when
    the student has no regular-term enrollments yet.
    """
    regular = [e for e in enrollments if e.term_taken in _TERM_ORDER]
    if not regular:
        # New student — default to First of the academic year they enrolled.
        return {
            "term": "First",
            "year": None,
            "reason": "no regular-term history yet — defaulting to First term.",
        }

    # Sort newest-first by (year, term-ordinal).
    last = max(regular, key=lambda e: (e.year_taken, _TERM_ORDER[e.term_taken]))
    if last.term_taken == "First":
        return {
            "term": "Second",
            "year": last.year_taken,
            "reason": f"your most recent term was First {last.year_taken}, so Second {last.year_taken} comes next.",
        }
    # last term was Second → next is First of the following academic year.
    return {
        "term": "First",
        "year": last.year_taken + 1,
        "reason": f"your most recent term was Second {last.year_taken}, so First {last.year_taken + 1} comes next.",
    }


def derive_expected_to_graduate(total_completed_hours: int, policy: dict[str, Any]) -> bool:
    """Auto-true when student has reached Fourth Level OR can finish next term."""
    level = determine_level(total_completed_hours, policy)
    if level in set(policy.get("auto_expected_to_graduate_levels", [])):
        return True
    total_required = int(policy.get("total_credit_hours_required_for_graduation", 0))
    remaining = max(total_required - total_completed_hours, 0)
    regular = (policy.get("credit_hour_limits", {}) or {}).get("regular", {}) or {}
    grad_cap = int(regular.get("max_credit_hours_with_graduation_approval", regular.get("max_credit_hours", 0)) or 0)
    return remaining > 0 and remaining <= grad_cap


def build_advisor_input(student: Student) -> dict[str, Any]:
    """Combine DB + catalog + policy into the kwargs `AcademicAdvisor` expects.

    The caller still chooses ``term`` and ``semester`` — those are
    planning variables, not student properties.
    """
    catalog = fetch_all_courses()
    catalog_by_code = {course["code"]: course for course in catalog}
    policy = load_policy()

    completed = to_completed_course_details(student, catalog_by_code)
    total_hours = sum(c["credit_hours"] for c in completed)
    gpa = compute_gpa(student.enrollments, catalog_by_code)
    level = determine_level(total_hours, policy)
    expected_to_graduate = derive_expected_to_graduate(total_hours, policy)

    return {
        "student_id": student.student_id,
        "name": student.name,
        "department": student.department,
        "enrolled_year": student.enrolled_year,
        "completed_course_details": completed,
        "total_completed_hours": total_hours,
        "gpa": gpa,
        "academic_level": level,
        "expected_to_graduate": expected_to_graduate,
        "graded_enrollment_count": len(student.enrollments),
    }
