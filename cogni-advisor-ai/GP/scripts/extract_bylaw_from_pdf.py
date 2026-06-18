#!/usr/bin/env python3
"""
Extract course distribution tables from eelu.pdf (IT bylaws 2023)
and merge into recommendation/data/bylaw_in.json.
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
PDF_PATH = GP_DIR / "eelu.pdf"
BYLAW_PATH = GP_DIR / "recommendation" / "data" / "bylaw_in.json"

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


def clean_code(raw: str) -> str:
    text = re.sub(r"\s+", "", (raw or "").strip().upper())
    if re.fullmatch(r"A1(\d{3})", text):
        return f"AI{match.group(1)}" if (match := re.fullmatch(r"A1(\d{3})", text)) else text
    if text == "IT111" or text.replace(" ", "") == "IT111":
        return "IT111"
    return text.replace(" ", "")


def clean_cell(value) -> str:
    if value is None:
        return ""
    return re.sub(r"\s+", " ", str(value).strip())


def is_course_code(value: str) -> bool:
    return bool(CODE_RE.match(clean_code(value)))


def parse_credit(value: str) -> int | None:
    text = clean_cell(value)
    if not text or not text.isdigit():
        return None
    return int(text)


def flatten_row(row: list) -> list[str]:
    return [clean_cell(c) for c in row]


def find_code_index(row: list[str]) -> int | None:
    for i, cell in enumerate(row):
        if is_course_code(cell):
            return i
    # Malformed rows: code in column 1 after empty first cell
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

    # Skip total-hour summary rows
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
            if re.fullmatch(r"\d+", c):
                numeric_slots.append(c)
                continue
            if re.fullmatch(r"\d+(\.\d+)?", c):
                numeric_slots.append(c)
                continue
            if any(
                kw in c.lower()
                for kw in (
                    "mathematics",
                    "statistics",
                    "programming",
                    "techniques",
                    "computers",
                    "electronics",
                    "structure",
                    "engineering",
                    "networks",
                    "project",
                    "design",
                    "probability",
                    "fundamentals",
                    "intelligence",
                    "micro",
                    "controller",
                    "advanced",
                    "introduction",
                    "logic",
                    "object",
                    "oriented",
                    "machine",
                    "learning",
                    "programing",
                    "operation",
                    "research",
                    "networking",
                    "technology",
                )
            ):
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
        # Standard 6-column layout
        # code | name | credit | lecture | lab | prereq
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


def parse_pdf() -> dict[str, list[dict]]:
    sections: dict[str, list[dict]] = {}
    current_year: str | None = None

    with pdfplumber.open(PDF_PATH) as pdf:
        for page in pdf.pages:
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
                pending_name: list[str] = []

                for row in table[2:]:  # skip header rows
                    cells = flatten_row(row)
                    code_idx = find_code_index(cells)

                    if code_idx is None:
                        # Continuation row for split course name (e.g. IT212 / Digital Signal Processing)
                        text_bits = [c for c in cells if c and not c.isdigit()]
                        if text_bits and courses:
                            courses[-1]["name"] = f"{courses[-1]['name']} {' '.join(text_bits)}".strip()
                        continue

                    course = extract_course_from_row(row, wide=wide)
                    if course:
                        courses.append(course)

                if courses:
                    sections[key] = courses

    return sections


def section_to_bylaw_keys(year_sem: str, courses: list[dict]) -> dict:
    """Map to bylaw_in.json key patterns expected by preprocess_bylaws."""
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

    if year in {"first_year", "second_year"}:
        prefix = f"{year}_{semester}_course"
        for i, c in enumerate(courses, start=1):
            out[f"{prefix}_{i}_code"] = c["code"]
            out[f"{prefix}_{i}_name"] = c["name"]
            out[f"{prefix}_{i}_credit_hours"] = c["credit_hours"]
            out[f"{prefix}_{i}_lecture_hours"] = c["lecture_hours"]
            out[f"{prefix}_{i}_exercise_lab_hours"] = c["lab_hours"]
            out[f"{prefix}_{i}_prerequisite"] = c["prerequisite"]
        out[f"{year}_{semester}_total_credit_hours"] = sum(c["credit_hours"] for c in courses)

    elif year == "third_year":
        # sparse keys: first_semester_course_code_N
        sem_short = "first" if semester == "first_semester" else "second"
        for i, c in enumerate(courses, start=1):
            out[f"{sem_short}_semester_course_code_{i}"] = c["code"]
            out[f"{sem_short}_semester_course_name_{i}"] = c["name"]
            out[f"{sem_short}_semester_prerequisite_{i}"] = c["prerequisite"]

    elif year == "fourth_year":
        # first_semester_course_N_*
        sem_short = "first" if semester == "first_semester" else "second"
        for i, c in enumerate(courses, start=1):
            out[f"{sem_short}_semester_course_{i}_code"] = c["code"]
            out[f"{sem_short}_semester_course_{i}_name"] = c["name"]
            out[f"{sem_short}_semester_course_{i}_credit_hours"] = c["credit_hours"]
            out[f"{sem_short}_semester_course_{i}_lecture_hours"] = c["lecture_hours"]
            out[f"{sem_short}_semester_course_{i}_exercise_lab_hours"] = c["lab_hours"]
            out[f"{sem_short}_semester_course_{i}_prerequisite"] = c["prerequisite"]

    return out


def strip_old_course_keys(data: dict) -> dict:
    patterns = (
        r"^(first|second|third|fourth)_year_.*",
        r"^first_semester_course",
        r"^second_semester_course",
        r"^page33_",
    )
    combined = re.compile("|".join(patterns))
    return {k: v for k, v in data.items() if not combined.match(k)}


# Courses missed by wide/malformed PDF tables (verified from eelu.pdf)
MANUAL_SECTION_PATCHES: dict[str, list[dict]] = {
    "second_year_second_semester": [
        {"code": "IT217", "name": "Introduction to Operation Research", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Programming Techniques, Probability and Statistics-1"},
        {"code": "IT216", "name": "Data Structure", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Object Oriented Programing"},
        {"code": "AI321", "name": "Machine Learning Fundamentals", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Mathematics-3, Probability and Statistics-2"},
        {"code": "HU427", "name": "Entrepreneurship", "credit_hours": 2, "lecture_hours": "1.5", "lab_hours": "-", "prerequisite": ""},
        {"code": "IT230", "name": "Web Technology", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Object Oriented Programing"},
        {"code": "LB211", "name": "Networking Fundamentals lab", "credit_hours": 2, "lecture_hours": "1.5", "lab_hours": "1.5", "prerequisite": "Computer Networks Technology"},
    ],
    "third_year_first_semester": [
        {"code": "LB312", "name": "Network Routing and Switching-Lab", "credit_hours": 2, "lecture_hours": "1.5", "lab_hours": "1.5", "prerequisite": "Networking Fundamentals lab"},
        {"code": "AI311", "name": "Artificial intelligence", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Data Structure"},
        {"code": "CS319", "name": "Operating Systems", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Data Structure"},
        {"code": "IT212", "name": "Digital Signal Processing", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Mathematics-3"},
        {"code": "CS318", "name": "Computer Organization", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Logic Design, Data Structure"},
        {"code": "CS341", "name": "Algorithms analysis and Design", "credit_hours": 3, "lecture_hours": "2.5", "lab_hours": "1.5", "prerequisite": "Data Structure"},
    ],
}


def apply_manual_patches(sections: dict[str, list[dict]]) -> dict[str, list[dict]]:
    for key, courses in MANUAL_SECTION_PATCHES.items():
        sections[key] = courses
    return sections


def merge_bylaw(sections: dict[str, list[dict]]) -> dict:
    with BYLAW_PATH.open(encoding="utf-8") as f:
        data = json.load(f)

    data = strip_old_course_keys(data)
    data["document_year"] = 2023
    data["document_title_arabic"] = "توزيع مقررات لائحة برنامج البكالوريوس - تكنولوجيا المعلومات"
    data["document_title_english"] = "Bachelor Degree Program In Information Technology"
    data["distribution_source_pdf"] = "eelu.pdf"

    for year_sem, courses in sections.items():
        data.update(section_to_bylaw_keys(year_sem, courses))

    # Keep field training (not in distribution PDF)
    data["page33_course_code_1"] = "TR211"
    data["page33_course_name_1"] = "Field Training"
    data["page33_prerequisite_1"] = "Passing 60 Credit Hours"

    return data


def main():
    if not PDF_PATH.exists():
        raise FileNotFoundError(f"PDF not found: {PDF_PATH}")

    sections = parse_pdf()
    sections = apply_manual_patches(sections)
    total = sum(len(v) for v in sections.values())
    print(f"Parsed {total} courses across {len(sections)} semester sections")
    for k, v in sorted(sections.items()):
        codes = [c["code"] for c in v]
        print(f"  {k}: {codes}")

    merged = merge_bylaw(sections)
    BYLAW_PATH.write_text(json.dumps(merged, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Updated {BYLAW_PATH}")


if __name__ == "__main__":
    main()
