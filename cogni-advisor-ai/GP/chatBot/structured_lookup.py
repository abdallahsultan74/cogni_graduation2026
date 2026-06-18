"""Deterministic answers for common policy and curriculum queries.

Arabic questions and exact numeric facts should not depend solely on
English embedding retrieval. This module runs before RAG and returns a
complete answer when the query matches a known pattern.
"""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

BASE_DIR = Path(__file__).resolve().parent
EELULAW_DIR = BASE_DIR / "data" / "eelulaw"
RECOMMENDATION_DATA = BASE_DIR.parent / "recommendation" / "data"

YEAR_ORDINALS = ("first", "second", "third", "fourth")
YEAR_AR = {
    1: "السنة الأولى",
    2: "السنة الثانية",
    3: "السنة الثالثة",
    4: "السنة الرابعة",
}
YEAR_AR_ALT = {
    1: ("سنة أولى", "السنة الأولى", "اولى"),
    2: ("سنة تانية", "السنة التانية", "سنة ثانية", "السنة الثانية", "تانية", "ثانية"),
    3: ("سنة ثالثة", "السنة الثالثة", "ثالثة"),
    4: ("سنة رابعة", "السنة الرابعة", "رابعة"),
}
SEMESTER_AR = {1: "الترم الأول", 2: "الترم الثاني"}
SEMESTER_AR_ALT = {
    1: ("ترم أول", "الفصل الأول", "فصل أول"),
    2: ("ترم تاني", "ترم ثاني", "الفصل الثاني", "فصل ثاني"),
}


def _is_arabic(text: str) -> bool:
    return any("\u0600" <= ch <= "\u06ff" for ch in text)


def _normalize(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[؟?!.,؛:]+", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text


@lru_cache(maxsize=1)
def _load_policy() -> dict[str, Any]:
    path = RECOMMENDATION_DATA / "policy.json"
    if path.exists():
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)
    return {}


@lru_cache(maxsize=1)
def _load_bylaw_in() -> dict[str, Any]:
    path = RECOMMENDATION_DATA / "bylaw_in.json"
    if path.exists():
        with path.open(encoding="utf-8") as handle:
            return json.load(handle)
    return {}


@lru_cache(maxsize=1)
def _load_distribution() -> list[dict[str, Any]]:
    path = EELULAW_DIR / "distribution_by_semester.json"
    if not path.exists():
        return []
    with path.open(encoding="utf-8") as handle:
        data = json.load(handle)
    return [b for b in data.get("blocks", []) if isinstance(b, dict)]


def _match_summer_hours(question: str) -> bool:
    q = _normalize(question)
    has_summer = bool(
        re.search(r"صيف|summer", q)
        or "الفصل الصيفي" in question
        or "فصل صيفي" in question
    )
    has_hours = bool(
        re.search(r"ساع|hour|حد|max|أقصى|اقصى|تسجيل|register|credit", q)
    )
    return has_summer and has_hours


def _answer_summer_hours(arabic: bool) -> str:
    policy = _load_policy()
    summer = (policy.get("credit_hour_limits") or {}).get("summer") or {}
    max_regular = summer.get("max_credit_hours", 9)
    max_grad = summer.get("max_credit_hours_with_graduation_approval", 12)
    if arabic:
        return (
            f"الحد الأقصى للساعات المعتمدة في الفصل الصيفي هو {max_regular} ساعات. "
            f"للطلاب المتوقع تخرجهم وبحصولهم على موافقة، يمكن رفع الحد إلى {max_grad} ساعة."
        )
    return (
        f"The maximum credit hours in the summer semester is {max_regular}. "
        f"Students expected to graduate may register up to {max_grad} credit hours with approval."
    )


def _match_attendance(question: str) -> bool:
    q = _normalize(question)
    return bool(re.search(r"حضور|attendance|غياب|absence", q))


def _answer_attendance(arabic: bool) -> str:
    bylaw = _load_bylaw_in()
    pct = bylaw.get("minimum_attendance_percentage", 75)
    if arabic:
        return (
            f"الحد الأدنى للحضور المطلوب هو {pct}%. "
            "أقل من ذلك قد يؤدي إلى الحرمان من الامتحان النهائي وتسجيل درجة رسوب."
        )
    return (
        f"The minimum required attendance is {pct}%. "
        "Below that threshold, a student may be deprived of the final exam and receive a Fail grade."
    )


def _parse_year_semester(question: str) -> tuple[int, int] | None:
    q = _normalize(question)
    year_num: int | None = None
    sem_num: int | None = None

    for num, patterns in YEAR_AR_ALT.items():
        if any(p in question or p in q for p in patterns):
            year_num = num
            break
    if year_num is None:
        m = re.search(r"(?:year|سنة)\s*(\d)", q)
        if m:
            year_num = int(m.group(1))

    for num, patterns in SEMESTER_AR_ALT.items():
        if any(p in question or p in q for p in patterns):
            sem_num = num
            break
    if sem_num is None:
        if re.search(r"first\s*semester|term\s*1", q):
            sem_num = 1
        elif re.search(r"second\s*semester|term\s*2", q):
            sem_num = 2

    if year_num is None or sem_num is None:
        return None
    if year_num < 1 or year_num > 4 or sem_num not in (1, 2):
        return None
    return year_num, sem_num


def _match_curriculum(question: str) -> bool:
    q = _normalize(question)
    has_curriculum = bool(
        re.search(r"مواد|مقرر|courses|curriculum|توزيع|distribution", q)
        or "إيه مواد" in question
        or "ايه مواد" in q
    )
    return has_curriculum and _parse_year_semester(question) is not None


def _answer_curriculum(question: str, arabic: bool) -> str | None:
    parsed = _parse_year_semester(question)
    if not parsed:
        return None
    year_num, sem_num = parsed
    key = f"{YEAR_ORDINALS[year_num - 1]}_year_{YEAR_ORDINALS[sem_num - 1]}_semester"
    block = next((b for b in _load_distribution() if b.get("key") == key), None)
    if not block:
        return None

    courses = block.get("courses") or []
    codes = [c.get("code", "") for c in courses if c.get("code")]
    if not codes:
        return None

    if arabic:
        year_label = YEAR_AR.get(year_num, str(year_num))
        sem_label = SEMESTER_AR.get(sem_num, str(sem_num))
        names = ", ".join(
            f"{c.get('code')} ({c.get('name', '')})" for c in courses if c.get("code")
        )
        return (
            f"مواد {year_label} — {sem_label}:\n"
            f"{', '.join(codes)}\n\n"
            f"التفاصيل: {names}"
        )

    year_en = f"Year {year_num}"
    sem_en = "First semester" if sem_num == 1 else "Second semester"
    return (
        f"Courses for {year_en}, {sem_en}: {', '.join(codes)}"
    )


def _match_plan(question: str) -> bool:
    q = _normalize(question)
    return bool(
        re.search(r"خطة|plan|study plan|تسجيل|الفصل القادم|next semester|next term", q)
        and re.search(r"خطة|plan|دراس|study|قادم|next|تسجيل", q)
    )


def _normalize_department(major_type: Any) -> str:
    value = str(major_type or "IT").strip().upper()
    return "AI" if value == "AI" else "IT"


def _infer_planning_term(completed_codes: list[str], catalog_by_code: dict[str, dict]) -> str:
    from recommendation.utils import satisfies_prereq

    completed_set = set(completed_codes)
    total_hours = sum(
        int(catalog_by_code[c].get("credit_hours", 0))
        for c in completed_codes
        if c in catalog_by_code
    )
    best_term = "First"
    best_score = -1
    for term in ("First", "Second", "Summer"):
        score = 0
        for code, meta in catalog_by_code.items():
            if code in completed_set:
                continue
            terms = meta.get("Term") or meta.get("term") or []
            if isinstance(terms, str):
                terms = [terms]
            if "All" not in terms and term not in terms:
                continue
            if meta.get("type") == "Elective":
                continue
            prereqs = meta.get("prerequisites") or []
            if all(
                satisfies_prereq(p, list(completed_set), total_hours) for p in prereqs
            ):
                score += 1
        if score > best_score:
            best_score = score
            best_term = term
    return best_term


def _build_completed_details(
    completed_codes: list[str],
    department: str,
) -> list[dict[str, Any]]:
    from recommendation.utils import fetch_all_courses, normalize_course

    catalog = {c["code"]: normalize_course(c) for c in fetch_all_courses(department)}
    details: list[dict[str, Any]] = []
    for code in completed_codes:
        if code in catalog:
            details.append(dict(catalog[code]))
        else:
            details.append(
                {
                    "code": code,
                    "course_name": code,
                    "credit_hours": 3,
                    "distribution_category": "",
                    "type": "Mandatory",
                    "prerequisites": [],
                    "Term": ["All"],
                    "department": department,
                }
            )
    return details


def _format_plan_answer(
    result: dict[str, Any],
    term: str,
    ctx_text: str,
    arabic: bool,
) -> str:
    summary = result.get("student_summary") or {}
    core = result.get("core_courses") or []
    electives = result.get("electives") or {}
    credit_limit = summary.get("credit_limit", "?")
    level = summary.get("academic_level", "?")
    gpa = summary.get("gpa", "?")

    core_lines = [
        f"- {c.get('code')} ({c.get('credit_hours', '?')} ساعة)"
        for c in core
    ]
    elective_bits: list[str] = []
    if electives.get("General"):
        elective_bits.append(f"اختياري عام: {electives['General']} مقرر")
    if electives.get("Applied"):
        elective_bits.append(f"اختياري تطبيقي: {electives['Applied']} مقرر")

    if arabic:
        parts = [
            f"بناءً على سجلك الأكاديمي:\n{ctx_text}",
            f"\nالترم المقترح: {term} — المستوى: {level} — المعدل: {gpa} — حد الساعات: {credit_limit}",
        ]
        if core_lines:
            parts.append("\nالمقررات الأساسية المقترحة للفصل القادم:")
            parts.extend(core_lines)
        else:
            parts.append("\nلا توجد مقررات إلزامية متاحة للتسجيل في هذا الترم حسب المتطلبات السابقة.")
        if elective_bits:
            parts.append("\n" + "؛ ".join(elective_bits))
        parts.append(
            "\nيمكنك تعديل الخطة من صفحة «خطتي الدراسية» وإرسالها لمرشدك."
        )
        return "\n".join(parts)

    parts = [
        f"Based on your record:\n{ctx_text}",
        f"\nSuggested term: {term} — Level: {level} — GPA: {gpa} — Credit cap: {credit_limit}",
    ]
    if core_lines:
        parts.append("\nRecommended core courses:")
        parts.extend(core_lines)
    else:
        parts.append("\nNo mandatory courses are available for registration this term.")
    if elective_bits:
        parts.append("\nElective slots available.")
    return "\n".join(parts)


def try_plan_answer(question: str, student_context: dict[str, Any] | None) -> str | None:
    if not _match_plan(question) or not student_context:
        return None

    completed = student_context.get("completed_courses") or []
    if not completed and not student_context.get("earned_hours"):
        return None

    try:
        from recommendation.utils import AcademicAdvisor, determine_level, load_policy

        department = _normalize_department(student_context.get("major_type"))
        gpa = float(student_context.get("cumulative_gpa") or 0)
        earned = int(student_context.get("earned_hours") or 0)
        policy = load_policy()
        level = determine_level(earned, policy)
        expected = str(level) in set(policy.get("auto_expected_to_graduate_levels", []))

        completed_details = _build_completed_details(completed, department)
        catalog_by_code = {c["code"]: c for c in completed_details}
        from recommendation.utils import fetch_all_courses, normalize_course

        for c in fetch_all_courses(department):
            nc = normalize_course(c)
            catalog_by_code.setdefault(nc["code"], nc)

        term = _infer_planning_term(completed, catalog_by_code)
        advisor = AcademicAdvisor(
            "chatbot",
            gpa,
            expected,
            "regular",
            term,
            department,
            completed_course_details=completed_details,
        )
        result = advisor.run()

        ctx_parts: list[str] = []
        if student_context.get("level") is not None:
            ctx_parts.append(f"المستوى: {student_context['level']}")
        if student_context.get("major_type"):
            ctx_parts.append(f"المسار: {student_context['major_type']}")
        if student_context.get("cumulative_gpa") is not None:
            ctx_parts.append(f"المعدل التراكمي: {student_context['cumulative_gpa']}")
        if student_context.get("earned_hours") is not None:
            ctx_parts.append(f"الساعات المكتسبة: {student_context['earned_hours']}")
        if completed:
            ctx_parts.append(f"المقررات الناجحة: {', '.join(completed)}")

        return _format_plan_answer(
            result,
            term,
            "\n".join(ctx_parts),
            _is_arabic(question),
        )
    except Exception:
        return None


def try_structured_answer(question: str) -> str | None:
    """Return a deterministic answer or None to fall through to RAG."""
    if not question or not question.strip():
        return None

    arabic = _is_arabic(question)
    if _match_summer_hours(question):
        return _answer_summer_hours(arabic)
    if _match_attendance(question):
        return _answer_attendance(arabic)
    if _match_curriculum(question):
        return _answer_curriculum(question, arabic)
    return None


def expand_query_for_retrieval(question: str) -> str:
    """Add English retrieval hints for Arabic policy questions."""
    hints: list[str] = []
    q = _normalize(question)
    if _match_summer_hours(question):
        hints.append("summer semester maximum credit hours registration limit")
    if _match_attendance(question):
        hints.append("minimum attendance percentage 75 percent")
    if _match_curriculum(question):
        parsed = _parse_year_semester(question)
        if parsed:
            y, s = parsed
            hints.append(
                f"curriculum distribution year {y} semester {s} course codes"
            )
    if re.search(r"صيف|summer", q) and not hints:
        hints.append("summer semester credit hours")
    if re.search(r"حضور|attendance", q) and not hints:
        hints.append("attendance percentage")
    if not hints:
        return question
    return f"{question}\n{' '.join(hints)}"
