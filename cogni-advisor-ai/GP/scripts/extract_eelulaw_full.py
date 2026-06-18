#!/usr/bin/env python3
"""
Extract full IT bylaws from eelulaw.pdf:
- Policy articles (structured JSON for RAG)
- Course category lists (Article 16)
- Appendix semester distribution (pages 31-35)
- Course descriptions
Merge into recommendation/data/bylaw_in.json and chatBot/data/eelulaw/.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pdfplumber

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

GP_DIR = Path(__file__).resolve().parent.parent
PDF_PATH = GP_DIR / "eelulaw.pdf"
BYLAW_PATH = GP_DIR / "recommendation" / "data" / "bylaw_in.json"
RAG_DIR = GP_DIR / "chatBot" / "data" / "eelulaw"

APPENDIX_PAGE_RANGE = range(30, 35)  # pages 31-35 (0-indexed)

YEAR_MAP = {
    "first year": "first_year",
    "second year": "second_year",
    "third year": "third_year",
    "fourth year": "fourth_year",
}

SEMESTER_MAP = {
    "first semester": "first_semester",
    "second semester": "second_semester",
}

CODE_RE = re.compile(r"^[A-Z]{2}\s*\d{3}$", re.I)

# Article 16 category lists from eelulaw.pdf pages 10-18 (authoritative)
GENERAL_MANDATORY = ["HU111", "HU112", "HU113"]
GENERAL_ELECTIVE = ["HU101", "HU402", "HU201", "HU124", "HU125", "HU115", "HU427", "HU128"]
MATH_BASIC_SCIENCES = ["MA111", "MA112", "MA113", "MA214", "ST121", "ST222", "IT111", "IT113"]
BASIC_COMPUTER_SCIENCE = [
    "IT110", "CS112", "CS215", "CS216", "CS240", "IT217", "DS211", "IT230",
    "CS318", "IT231", "CS341", "CS319", "AI311",
]

# Fallback appendix sections if PDF table parse is incomplete (from eelulaw appendix)
APPENDIX_FALLBACK: dict[str, list[dict]] = {
    "first_year_first_semester": [
        {"code": "IT111", "name": "Electronics", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": ""},
        {"code": "MA111", "name": "Mathematics1-", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": ""},
        {"code": "HU111", "name": "Technical Report Writing", "credit_hours": 2, "lecture_hours": "1.5", "lab_hours": "-", "prerequisite": ""},
        {"code": "HU113", "name": "Human Rights", "credit_hours": 2, "lecture_hours": "1.5", "lab_hours": "-", "prerequisite": ""},
        {"code": "MA112", "name": "Discrete Math", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": ""},
        {"code": "IT110", "name": "Introduction to Computers", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": ""},
    ],
    "first_year_second_semester": [
        {"code": "ST121", "name": "Probability and Statistics-1", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Mathematics-1"},
        {"code": "HU112", "name": "Creative and Scientific Thinking", "credit_hours": 2, "lecture_hours": "1.5", "lab_hours": "-", "prerequisite": ""},
        {"code": "MA113", "name": "Mathematics-2", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Mathematics-1"},
        {"code": "HU101", "name": "Micro Economics", "credit_hours": 2, "lecture_hours": "1.5", "lab_hours": "-", "prerequisite": ""},
        {"code": "IT113", "name": "Logic Design", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Electronics"},
        {"code": "CS112", "name": "Programming Language", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Introduction to Computers"},
    ],
    "second_year_first_semester": [
        {"code": "CS215", "name": "Object Oriented Programing", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Programming Language"},
        {"code": "DS211", "name": "Introduction to Database systems", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Programming Language"},
        {"code": "MA214", "name": "Mathematics-3", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Mathematics-2"},
        {"code": "IT231", "name": "Computer Networks Technology", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Introduction to Computers"},
        {"code": "ST222", "name": "Probability and Statistics-2", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Probability and Statistics-1"},
        {"code": "CS240", "name": "Introduction to Software Engineering", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Programming Language"},
    ],
    "second_year_second_semester": [
        {"code": "IT217", "name": "Introduction to Operation Research", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Programming Language, Probability and Statistics-1"},
        {"code": "CS216", "name": "Data Structure", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Object Oriented Programing"},
        {"code": "IT221", "name": "Computer Graphics", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Object Oriented Programing"},
        {"code": "IT230", "name": "Web Technology", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Object Oriented Programing"},
        {"code": "IT212", "name": "Digital Signal Processing", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Mathematics-3"},
    ],
    "third_year_first_semester": [
        {"code": "LB312", "name": "Network Routing and Switching-Lab", "credit_hours": 2, "lecture_hours": "1.5", "lab_hours": "1.5", "prerequisite": "Networking Fundamentals lab"},
        {"code": "AI311", "name": "Artificial intelligence", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Data Structure"},
        {"code": "CS319", "name": "Operating Systems", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Data Structure"},
        {"code": "AI321", "name": "Machine Learning Fundamentals", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Mathematics-3, Probability and Statistics-2"},
        {"code": "CS318", "name": "Computer Organization", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Logic Design, Data Structure"},
        {"code": "CS341", "name": "Algorithms analysis and Design", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Data Structure"},
    ],
    "third_year_second_semester": [
        {"code": "IT322", "name": "Pattern Recognition", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Digital Signal Processing, Probability and Statistics-2"},
        {"code": "IT333", "name": "Information Computer Networks Security", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Computer Networks Technology"},
        {"code": "AI448", "name": "Natural Language Processing", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Machine Learning Fundamentals"},
        {"code": "CS344", "name": "Advanced Software Engineering", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Introduction to Software Engineering"},
        {"code": "IT343", "name": "Micro controller", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Computer Networks Technology"},
        {"code": "LB313", "name": "Ethical Hacking-lab", "credit_hours": 2, "lecture_hours": "1.5", "lab_hours": "1.5", "prerequisite": "Computer Networks Technology"},
    ],
    "fourth_year_first_semester": [
        {"code": "LB421", "name": "Selected labs in Software Engineering", "credit_hours": 2, "lecture_hours": "1.5", "lab_hours": "1.5", "prerequisite": "Algorithms analysis and Design, Advanced Software Engineering"},
        {"code": "IT423", "name": "Embedded Systems", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Micro controller"},
        {"code": "HU427", "name": "Entrepreneurship", "credit_hours": 2, "lecture_hours": "1.5", "lab_hours": "-", "prerequisite": ""},
        {"code": "IT434", "name": "Advanced Computer Networks", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Computer Networks Technology"},
        {"code": "PC401", "name": "Project (1)", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "2", "prerequisite": "Passing 85 Credit Hours"},
        {"code": "CS446", "name": "Software Design and architecture", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": ""},
    ],
    "fourth_year_second_semester": [
        {"code": "CS447", "name": "Selected topics in software engineering", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": ""},
        {"code": "IT437", "name": "Selected topics in Computer networks", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": ""},
        {"code": "CS445", "name": "Software Testing and QA", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": ""},
        {"code": "IT438", "name": "Communication Technology", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Computer Networks Technology"},
        {"code": "PC402", "name": "Project (2)", "credit_hours": 3, "lecture_hours": "1", "lab_hours": "4", "prerequisite": "Project(1)"},
        {"code": "LB431", "name": "Selected labs in AI", "credit_hours": 2, "lecture_hours": "1.5", "lab_hours": "1.5", "prerequisite": "Artificial Intelligence"},
    ],
}


def clean_code(raw: str) -> str:
    text = re.sub(r"\s+", "", (raw or "").strip().upper())
    if re.fullmatch(r"A1(\d{3})", text):
        return f"AI{text[2:]}"
    if text == "HU413":
        return "HU113"
    return text


def clean_cell(value) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip())


def is_course_code(value: str) -> bool:
    return bool(CODE_RE.match(clean_code(value)))


def parse_credit(value: str) -> int | None:
    text = clean_cell(value)
    if not text or not text.replace(".", "").isdigit():
        return None
    return int(float(text))


def flatten_row(row: list) -> list[str]:
    return [clean_cell(c) for c in row]


def find_code_index(row: list[str]) -> int | None:
    for i, cell in enumerate(row):
        if is_course_code(cell):
            return i
    for i, cell in enumerate(row):
        cleaned = clean_cell(cell)
        if cleaned and CODE_RE.match(clean_code(cleaned)):
            return i
    return None


def extract_course_from_row(row: list, wide: bool = False) -> dict | None:
    cells = flatten_row(row)
    if not any(cells):
        return None
    code_idx = find_code_index(cells)
    if code_idx is None:
        return None
    code = clean_code(cells[code_idx])
    if not code:
        return None
    rest = [c for j, c in enumerate(cells) if j != code_idx and c]
    if len(rest) == 1 and rest[0].isdigit() and int(rest[0]) >= 10:
        return None

    if wide:
        name_parts: list[str] = []
        prereq_parts: list[str] = []
        credit = None
        lecture = None
        lab = None
        numeric_slots: list[str] = []
        for j, c in enumerate(cells):
            if j == code_idx or not c or c == "-":
                continue
            if re.fullmatch(r"\d+(\.\d+)?", c):
                numeric_slots.append(c)
                continue
            if any(kw in c.lower() for kw in ("mathematics", "statistics", "programming", "computers", "structure", "networks", "probability", "oriented", "language", "design", "project", "learning", "fundamentals", "engineering", "electronics", "techniques", "operation", "research", "controller", "intelligence", "micro")):
                prereq_parts.append(c)
            else:
                name_parts.append(c)
        if numeric_slots:
            credit = parse_credit(numeric_slots[0])
            if len(numeric_slots) > 1:
                lecture = numeric_slots[1]
            if len(numeric_slots) > 2:
                lab = numeric_slots[2]
        name = " ".join(name_parts).strip()
        prereq = ", ".join(prereq_parts).strip()
    else:
        name = cells[code_idx + 1] if code_idx + 1 < len(cells) else ""
        credit = parse_credit(cells[code_idx + 2]) if code_idx + 2 < len(cells) else None
        lecture = cells[code_idx + 3] if code_idx + 3 < len(cells) else ""
        lab = cells[code_idx + 4] if code_idx + 4 < len(cells) else ""
        prereq = cells[code_idx + 5] if code_idx + 5 < len(cells) else ""

    if not name:
        return None
    return {
        "code": code,
        "name": name,
        "credit_hours": credit or (3 if not code.startswith(("LB", "HU")) else 2),
        "lecture_hours": lecture or "",
        "lab_hours": lab or "",
        "prerequisite": prereq.replace("-", "").strip() if prereq != "-" else "",
    }


def detect_year(text: str) -> str | None:
    lower = text.lower()
    for key, val in YEAR_MAP.items():
        if key in lower:
            return val
    return None


def detect_semester(table: list) -> str | None:
    if not table:
        return None
    header = " ".join(flatten_row(table[0])).lower()
    for key, val in SEMESTER_MAP.items():
        if key in header:
            return val
    return None


def parse_appendix_pdf() -> dict[str, list[dict]]:
    sections: dict[str, list[dict]] = {}
    current_year: str | None = None

    with pdfplumber.open(PDF_PATH) as pdf:
        for page_idx in APPENDIX_PAGE_RANGE:
            if page_idx >= len(pdf.pages):
                continue
            page = pdf.pages[page_idx]
            page_text = page.extract_text() or ""
            year = detect_year(page_text)
            if year:
                current_year = year

            for table in page.extract_tables() or []:
                semester = detect_semester(table)
                if not semester or not current_year:
                    continue
                key = f"{current_year}_{semester}"
                wide = len(table[0] if table else []) > 8
                courses: list[dict] = []
                for row in table[2:]:
                    cells = flatten_row(row)
                    if find_code_index(cells) is None:
                        text_bits = [c for c in cells if c and not c.isdigit()]
                        if text_bits and courses:
                            courses[-1]["name"] = f"{courses[-1]['name']} {' '.join(text_bits)}".strip()
                        continue
                    course = extract_course_from_row(row, wide=wide)
                    if course:
                        courses.append(course)
                if courses:
                    sections[key] = courses

    for key, fallback in APPENDIX_FALLBACK.items():
        parsed = sections.get(key, [])
        if len(parsed) < len(fallback):
            sections[key] = fallback

    return sections


def section_to_bylaw_keys(year_sem: str, courses: list[dict]) -> dict:
    out: dict = {}
    year = None
    semester = None
    for y in ("first_year", "second_year", "third_year", "fourth_year"):
        if year_sem.startswith(f"{y}_"):
            year = y
            semester = year_sem[len(y) + 1 :]
            break
    if not year or not semester:
        return out

    if year in {"first_year", "second_year", "third_year"}:
        prefix = f"{year}_{semester}_course"
        for i, c in enumerate(courses, start=1):
            out[f"{prefix}_{i}_code"] = c["code"]
            out[f"{prefix}_{i}_name"] = c["name"]
            out[f"{prefix}_{i}_credit_hours"] = c["credit_hours"]
            out[f"{prefix}_{i}_lecture_hours"] = c["lecture_hours"]
            out[f"{prefix}_{i}_exercise_lab_hours"] = c["lab_hours"]
            out[f"{prefix}_{i}_prerequisite"] = c["prerequisite"]
        out[f"{year}_{semester}_total_credit_hours"] = sum(c["credit_hours"] for c in courses)
    elif year == "fourth_year":
        sem_short = "first" if semester == "first_semester" else "second"
        for i, c in enumerate(courses, start=1):
            out[f"{sem_short}_semester_course_{i}_code"] = c["code"]
            out[f"{sem_short}_semester_course_{i}_name"] = c["name"]
            out[f"{sem_short}_semester_course_{i}_credit_hours"] = c["credit_hours"]
            out[f"{sem_short}_semester_course_{i}_lecture_hours"] = c["lecture_hours"]
            out[f"{sem_short}_semester_course_{i}_exercise_lab_hours"] = c["lab_hours"]
            out[f"{sem_short}_semester_course_{i}_prerequisite"] = c["prerequisite"]
        out[f"{sem_short}_semester_total_credit_hours"] = sum(c["credit_hours"] for c in courses)

    return out


def strip_old_distribution_keys(data: dict) -> dict:
    patterns = (
        r"^(first|second|third|fourth)_year_.*",
        r"^first_semester_course",
        r"^second_semester_course",
        r"^first_semester_credit_",
        r"^second_semester_credit_",
        r"^page33_",
    )
    combined = re.compile("|".join(patterns))
    return {k: v for k, v in data.items() if not combined.match(k)}


def build_policy_flat() -> dict:
    """Canonical policy fields from eelulaw.pdf (Articles 1-16)."""
    return {
        "document_year": 2021,
        "document_title_arabic": "لائحة برنامج البكالوريوس - تكنولوجيا المعلومات",
        "document_title_english": "Bachelor Degree Program In Information Technology",
        "document_source_pdf": "eelulaw.pdf",
        "study_system_type": "Credit hours",
        "bachelor_degree_required_credit_hours": 135,
        "language_of_instruction": "English",
        "min_credit_hours_main_semesters": 9,
        "max_credit_hours_main_semesters": 18,
        "max_credit_hours_main_semesters_with_approval_for_graduation": 21,
        "max_credit_hours_summer_semester": 9,
        "max_credit_hours_summer_semester_with_approval_for_graduation": 12,
        "minimum_attendance_percentage": 75,
        "article_9_exam_total_grade": 100,
        "article_9_minimum_course_pass_percentage": 50,
        "article_9_minimum_final_exam_pass_percentage": 30,
        "article_11_retake_grade": "D+",
        "article_11_retake_grade_percentage": 64,
        "article_13_level_1_credit_hours_threshold": 30,
        "article_13_level_3_credit_hours_threshold": 63,
        "article_13_level_4_credit_hours_threshold": 96,
        "article_16_general_requirements_total_credit_hours": 12,
        "article_16_general_requirements_mandatory_humanities_social_credit_hours": 6,
        "article_16_general_requirements_elective_humanities_social_credit_hours": 6,
        "article_16_college_requirements_total_credit_hours": 63,
        "article_16_college_requirements_math_basic_sciences_credit_hours": 24,
        "article_16_college_requirements_basic_computer_science_credit_hours": 39,
        "specialization_requirements_total_hours": 60,
        "specialization_requirements_applied_sciences_mandatory_hours": 27,
        "specialization_requirements_applied_sciences_elective_hours": 15,
        "specialization_requirements_project_hours": 6,
        "specialization_requirements_specialized_labs_hours": 10,
        "specialization_requirements_training_hours": 2,
        "distribution_source_pdf": "eelulaw.pdf",
        "distribution_appendix_pages": "31-35",
        "category_general_mandatory_codes": GENERAL_MANDATORY,
        "category_general_elective_codes": GENERAL_ELECTIVE,
        "category_math_basic_sciences_codes": MATH_BASIC_SCIENCES,
        "category_basic_computer_science_codes": BASIC_COMPUTER_SCIENCE,
    }


def build_articles_policy_json(flat: dict) -> dict:
    return {
        "source": "eelulaw.pdf",
        "program": flat["document_title_english"],
        "year": flat["document_year"],
        "articles": [
            {
                "id": 1,
                "title_en": "Study System",
                "summary_en": "Credit-hour system; 135 credit hours required for graduation. Two main semesters (16 weeks) plus summer (6 weeks).",
            },
            {
                "id": 4,
                "title_en": "Registration, Drop and Add",
                "summary_en": (
                    f"Regular semester: minimum {flat['min_credit_hours_main_semesters']} credit hours, "
                    f"maximum {flat['max_credit_hours_main_semesters']} (up to "
                    f"{flat['max_credit_hours_main_semesters_with_approval_for_graduation']} with graduation approval). "
                    f"Summer: maximum {flat['max_credit_hours_summer_semester']} "
                    f"(up to {flat['max_credit_hours_summer_semester_with_approval_for_graduation']} with approval)."
                ),
                "summary_ar": (
                    f"الفصل العادي: الحد الأدنى {flat['min_credit_hours_main_semesters']} ساعات، "
                    f"والحد الأقصى {flat['max_credit_hours_main_semesters']} ساعة "
                    f"(حتى {flat['max_credit_hours_main_semesters_with_approval_for_graduation']} للتخرج). "
                    f"الصيف: حتى {flat['max_credit_hours_summer_semester']} ساعات."
                ),
            },
            {
                "id": 6,
                "title_en": "Attendance",
                "summary_en": f"Minimum attendance {flat['minimum_attendance_percentage']}% required; below that may result in Fail and deprivation from final exam.",
                "summary_ar": f"الحد الأدنى للحضور {flat['minimum_attendance_percentage']}%؛ أقل من ذلك قد يؤدي إلى رسوب.",
            },
            {
                "id": 9,
                "title_en": "Examination System",
                "summary_en": (
                    f"Course total 100; pass at {flat['article_9_minimum_course_pass_percentage']}% "
                    f"with at least {flat['article_9_minimum_final_exam_pass_percentage']}% on final exam. "
                    "50% semester work, 50% final exam."
                ),
            },
            {
                "id": 10,
                "title_en": "Grading and GPA",
                "grading_scale": [
                    {"grade": "A+", "points": 4.0, "percentage": "90 or more"},
                    {"grade": "A", "points": 3.7, "percentage": "85 to less than 90"},
                    {"grade": "B+", "points": 3.3, "percentage": "80 to less than 85"},
                    {"grade": "B", "points": 3.0, "percentage": "75 to less than 80"},
                    {"grade": "C+", "points": 2.7, "percentage": "70 to less than 75"},
                    {"grade": "C", "points": 2.4, "percentage": "65 to less than 70"},
                    {"grade": "D+", "points": 2.2, "percentage": "60 to less than 65"},
                    {"grade": "D", "points": 2.0, "percentage": "50 to less than 60"},
                    {"grade": "F", "points": 0, "percentage": "less than 50"},
                ],
                "gpa_credit_caps": [
                    {"condition": "GPA <= 1.0", "max_credit_hours": 12},
                    {"condition": "1.0 < GPA < 2.0", "max_credit_hours": 15},
                    {"condition": "GPA >= 2.0", "max_credit_hours": 18},
                ],
            },
            {
                "id": 11,
                "title_en": "Course Repetition",
                "summary_en": f"If a student fails (below {flat['article_11_retake_grade_percentage']}), they must retake; maximum counted grade after retake is {flat['article_11_retake_grade']}.",
            },
            {
                "id": 13,
                "title_en": "Level Progression",
                "level_thresholds": [
                    {"label": "First Level", "max_exclusive_credit_hours": flat["article_13_level_1_credit_hours_threshold"]},
                    {"label": "Second Level", "max_exclusive_credit_hours": flat["article_13_level_3_credit_hours_threshold"]},
                    {"label": "Third Level", "max_exclusive_credit_hours": flat["article_13_level_4_credit_hours_threshold"]},
                    {"label": "Fourth Level", "max_exclusive_credit_hours": None},
                ],
            },
            {
                "id": 16,
                "title_en": "Course Curriculum Distribution",
                "total_credit_hours": flat["bachelor_degree_required_credit_hours"],
                "distribution": {
                    "general_requirements_mandatory": flat["article_16_general_requirements_mandatory_humanities_social_credit_hours"],
                    "general_requirements_elective": flat["article_16_general_requirements_elective_humanities_social_credit_hours"],
                    "math_and_basic_sciences": flat["article_16_college_requirements_math_basic_sciences_credit_hours"],
                    "basic_computer_science": flat["article_16_college_requirements_basic_computer_science_credit_hours"],
                    "applied_sciences_mandatory": flat["specialization_requirements_applied_sciences_mandatory_hours"],
                    "applied_sciences_elective": flat["specialization_requirements_applied_sciences_elective_hours"],
                    "graduation_project": flat["specialization_requirements_project_hours"],
                    "specialized_labs": flat["specialization_requirements_specialized_labs_hours"],
                    "field_training": flat["specialization_requirements_training_hours"],
                },
            },
        ],
    }


def build_course_categories_json() -> dict:
    return {
        "source": "eelulaw.pdf Article 16 (pages 10-18)",
        "general_requirements_mandatory": GENERAL_MANDATORY,
        "general_requirements_elective": GENERAL_ELECTIVE,
        "math_and_basic_sciences": MATH_BASIC_SCIENCES,
        "basic_computer_science": BASIC_COMPUTER_SCIENCE,
    }


def extract_course_descriptions(data: dict) -> dict:
    descriptions: dict[str, dict] = {}
    title_pattern = re.compile(r"^course_([a-z0-9]+)_title$", re.IGNORECASE)
    for key, value in data.items():
        match = title_pattern.match(key)
        if not match:
            continue
        code = clean_code(match.group(1))
        if not code:
            continue
        title = clean_cell(value)
        if ":" in title:
            _, title = title.split(":", 1)
        desc_key = f"course_{match.group(1)}_description"
        desc = clean_cell(data.get(desc_key, ""))
        prereq = clean_cell(data.get(f"course_{match.group(1)}_prerequisite", ""))
        if title or desc:
            descriptions[code] = {
                "code": code,
                "title": title.strip(),
                "prerequisite": prereq or "None",
                "description": desc,
            }
    return {"source": "eelulaw.pdf / bylaw_in.json", "courses": descriptions}


def build_distribution_json(sections: dict[str, list[dict]]) -> dict:
    blocks = []
    labels = {
        "first_year": "(First Year)",
        "second_year": "(Second year)",
        "third_year": "(Third year)",
        "fourth_year": "(Fourth year)",
    }
    for key in sorted(sections.keys()):
        year, sem = key.rsplit("_", 1)
        sem_label = "First semester" if sem == "first_semester" else "Second semester"
        blocks.append({
            "key": key,
            "year_label": labels.get(year, year),
            "semester_label": sem_label,
            "courses": sections[key],
        })
    return {"source": "eelulaw.pdf appendix pages 31-35", "blocks": blocks}


def merge_bylaw(sections: dict[str, list[dict]]) -> dict:
    if BYLAW_PATH.exists():
        with BYLAW_PATH.open(encoding="utf-8") as f:
            data = json.load(f)
    else:
        data = {}

    data = strip_old_distribution_keys(data)
    data.update(build_policy_flat())

    for year_sem, courses in sections.items():
        data.update(section_to_bylaw_keys(year_sem, courses))

    data["page33_course_code_1"] = "TR211"
    data["page33_course_name_1"] = "Field Training"
    data["page33_prerequisite_1"] = "Passing 60 Credit Hours"

    return data


def write_rag_artifacts(data: dict, sections: dict[str, list[dict]]) -> None:
    RAG_DIR.mkdir(parents=True, exist_ok=True)
    flat = {k: v for k, v in data.items() if k.startswith(("article_", "min_", "max_", "specialization_", "document_", "category_", "distribution_", "bachelor_", "language_", "minimum_", "study_"))}
    (RAG_DIR / "articles_policy.json").write_text(
        json.dumps(build_articles_policy_json(flat if flat else build_policy_flat()), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (RAG_DIR / "course_categories.json").write_text(
        json.dumps(build_course_categories_json(), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (RAG_DIR / "distribution_by_semester.json").write_text(
        json.dumps(build_distribution_json(sections), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (RAG_DIR / "course_descriptions.json").write_text(
        json.dumps(extract_course_descriptions(data), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def main():
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF not found: {PDF_PATH}")

    sections = parse_appendix_pdf()
    total = sum(len(v) for v in sections.values())
    print(f"Appendix: {total} courses across {len(sections)} semester sections")
    for k, v in sorted(sections.items()):
        print(f"  {k}: {[c['code'] for c in v]}")

    merged = merge_bylaw(sections)
    BYLAW_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Updated {BYLAW_PATH}")

    write_rag_artifacts(merged, sections)
    print(f"Wrote RAG artifacts to {RAG_DIR}")


if __name__ == "__main__":
    main()
