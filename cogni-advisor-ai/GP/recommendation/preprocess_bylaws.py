from collections import defaultdict
import json
from pathlib import Path
import re


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
BYLAW_PATH = DATA_DIR / "bylaw_in.json"
COURSES_PATH = DATA_DIR / "courses.json"
GRAPH_PATH = DATA_DIR / "prerequisite_graph.json"
POLICY_PATH = DATA_DIR / "policy.json"

GENERAL_MANDATORY_CODES = {"HU111", "HU112", "HU113"}
GENERAL_ELECTIVE_CODES = {"HU101", "HU102", "HU201", "HU124", "HU125", "HU115", "HU427", "HU128", "HU402"}


def load_bylaw_data():
    with BYLAW_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def clean_text(value):
    if value is None:
        return ""
    text = str(value).strip()
    if text in {"", "None", "none", "null", "Null", "-"}:
        return ""
    return re.sub(r"\s+", " ", text)


def clean_code(value):
    text = clean_text(value).upper().replace(" ", "")
    if not text:
        return ""
    match = re.fullmatch(r"A1(\d{3})", text)
    if match:
        return f"AI{match.group(1)}"
    if text == "HU413":
        return "HU113"
    return text


def normalize_name(value):
    text = clean_text(value).lower().replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def infer_credit_hours_from_code(code):
    if code.startswith("LB"):
        return 2
    if code.startswith(("PC", "TR")):
        return 3 if code.startswith("PC") else 2
    if code.startswith("HU"):
        return 2
    return 3


# Math and Basic Sciences — exact list from the official 2021 bylaw PDF
# (Article 16, page 11): 8 courses × 3 hrs = 24 hrs.
# Note: IT113 Logic Design is bylaw-classified here, not under BCS.
MATH_BASIC_SCI_CODES = {
    "MA111", "MA112", "MA113", "MA214",
    "ST121", "ST222",
    "IT111",  # Electronics
    "IT113",  # Logic Design — bylaw lists this in Math/Sciences, not BCS
}

# Basic Computer Science — exact list from the official 2021 bylaw PDF
# (Article 16, page 12-13): 13 courses × 3 hrs = 39 hrs.
# Faculty-wide requirement that EVERY track (CS, IT, IS, AI, DS) must take.
# Notable additions vs the previous heuristic:
#   - AI311 Artificial Intelligence is a Faculty Requirement, NOT an AI-track
#     specialization. Every student takes it.
#   - IT217 Operations Research and IT230 Web Technology are Faculty
#     Requirements, not Applied Sciences.
BASIC_CS_CODES = {
    "IT110",                              # Introduction to Computers
    "CS112", "CS215", "CS216",            # Programming, OOP, Data Structures
    "CS240",                              # Intro to Software Engineering
    "IT217",                              # Intro to Operations Research / Decision Support
    "DS211",                              # Intro to Database Systems
    "IT230",                              # Web Technology
    "CS318",                              # Computer Organization
    "IT231",                              # Computer Networks Technology
    "CS341",                              # Algorithms Analysis and Design
    "CS319",                              # Operating Systems
    "AI311",                              # Artificial Intelligence (faculty-wide)
}


def infer_distribution(code, level_label):
    prefix = code[:2]
    if prefix == "HU":
        return "General_Requirements"
    if code in MATH_BASIC_SCI_CODES or prefix in {"MA", "ST"}:
        return "Math_And_Basic_Sciences"
    if prefix == "LB":
        return "Specialized_Labs"
    if prefix == "PC":
        return "Graduation_Project"
    if prefix == "TR":
        return "Training_Field"
    if code in BASIC_CS_CODES:
        return "Basic_Computer_Science"
    # Anything left is treated as a specialization course. The bylaw's
    # level heuristic (third/fourth year → Applied) was the prior
    # fallback, but it overweighted offering-year and underweighted
    # subject; we keep it here as a last-resort guess only.
    return "Applied_Sciences"


def infer_type(code, distribution_category, level_label):
    if distribution_category in {"Specialized_Labs", "Graduation_Project", "Training_Field"}:
        return "Mandatory"
    if distribution_category == "General_Requirements":
        if code in GENERAL_MANDATORY_CODES:
            return "Mandatory"
        if code in GENERAL_ELECTIVE_CODES:
            return "Elective"
    if distribution_category == "Applied_Sciences" and level_label.startswith("Fourth Year"):
        return "Elective"
    return "Mandatory"


def add_course_record(records, code, course_name, credit_hours, term, level_label, raw_prerequisite="", lecture_hours=None, lab_hours=None):
    code = clean_code(code)
    course_name = clean_text(course_name)
    if not code or not course_name:
        return

    distribution_category = infer_distribution(code, level_label)
    course_type = infer_type(code, distribution_category, level_label)
    # Department tagging by category:
    # - Applied_Sciences / Graduation_Project: belongs to a specific track
    #   (AI for AI-prefixed codes, IT otherwise — the bylaw's per-department
    #   `applied_courses` lists name these explicitly).
    # - Specialized_Labs / Training_Field: the bylaw lists Training_Field
    #   as "mandatory for all departments" and does not partition Labs
    #   per department, so we treat both as common (`null`). This avoids
    #   incorrectly burning an AI student's outside-department budget on
    #   shared labs/training.
    if distribution_category in {"Applied_Sciences", "Graduation_Project"}:
        department = "AI" if code.startswith("AI") else "IT"
    else:
        department = "null"

    incoming = {
        "code": code,
        "course_name": course_name,
        "credit_hours": int(float(credit_hours)) if clean_text(credit_hours) else infer_credit_hours_from_code(code),
        "Term": [term],
        "level": level_label,
        "distribution_category": distribution_category,
        "type": course_type,
        "department": department,
        "raw_prerequisite": clean_text(raw_prerequisite),
    }
    if clean_text(lecture_hours):
        incoming["lecture_hours"] = float(lecture_hours)
    if clean_text(lab_hours):
        incoming["lab_hours"] = float(lab_hours)

    existing = records.get(code)
    if existing is None:
        records[code] = incoming
        return

    existing["Term"] = sorted(set(existing.get("Term", []) + incoming["Term"]))
    if len(incoming["course_name"]) > len(existing.get("course_name", "")):
        existing["course_name"] = incoming["course_name"]
    if not existing.get("raw_prerequisite") and incoming.get("raw_prerequisite"):
        existing["raw_prerequisite"] = incoming["raw_prerequisite"]
    if existing.get("distribution_category") in {"Basic_Computer_Science", "Applied_Sciences"} and incoming["distribution_category"] != existing["distribution_category"]:
        existing["distribution_category"] = incoming["distribution_category"]
    if existing.get("type") == "Elective" and incoming["type"] == "Mandatory":
        existing["type"] = "Mandatory"
    for field in ["credit_hours", "lecture_hours", "lab_hours", "level", "department"]:
        if field not in existing and field in incoming:
            existing[field] = incoming[field]


def parse_full_group(data, records, group_prefix, term, level_label):
    index = 1
    while True:
        code = clean_text(data.get(f"{group_prefix}_{index}_code"))
        if not code:
            break
        add_course_record(
            records,
            code=code,
            course_name=data.get(f"{group_prefix}_{index}_name"),
            credit_hours=data.get(f"{group_prefix}_{index}_credit_hours"),
            term=term,
            level_label=level_label,
            raw_prerequisite=data.get(f"{group_prefix}_{index}_prerequisite"),
            lecture_hours=data.get(f"{group_prefix}_{index}_lecture_hours"),
            lab_hours=data.get(f"{group_prefix}_{index}_exercise_lab_hours"),
        )
        index += 1


def parse_sparse_group(data, records, code_prefix, name_prefix, prereq_prefix, term, level_label):
    index = 1
    while True:
        code = clean_text(data.get(f"{code_prefix}_{index}"))
        name = clean_text(data.get(f"{name_prefix}_{index}"))
        if not code or not name:
            break
        add_course_record(
            records,
            code=code,
            course_name=name,
            credit_hours=infer_credit_hours_from_code(clean_code(code)),
            term=term,
            level_label=level_label,
            raw_prerequisite=data.get(f"{prereq_prefix}_{index}", ""),
        )
        index += 1


def apply_course_overrides(data, records):
    detailed_courses = defaultdict(dict)
    pattern = re.compile(r"^course_(\d+)_(code|title|prerequisite|description|credit_hours)$")
    for key, value in data.items():
        match = pattern.match(key)
        if match:
            detailed_courses[int(match.group(1))][match.group(2)] = value

    for payload in detailed_courses.values():
        code_text = clean_text(payload.get("code"))
        title_text = clean_text(payload.get("title"))
        codes = [clean_code(part) for part in code_text.split(",")] if code_text else []
        codes = [code for code in codes if code]
        if title_text == "Graduation Project":
            codes = ["PC401", "PC402"]
        for code in codes:
            if code not in records:
                continue
            if title_text and not code.startswith("PC"):
                records[code]["course_name"] = title_text
            prereq_text = clean_text(payload.get("prerequisite"))
            if prereq_text:
                if code == "PC401":
                    records[code]["raw_prerequisite"] = prereq_text
                elif code == "PC402":
                    records[code]["raw_prerequisite"] = "Passing 85 Credit Hours, Project (1)"
                else:
                    records[code]["raw_prerequisite"] = prereq_text

    title_pattern = re.compile(r"^course_([a-z0-9]+)_title$", re.IGNORECASE)
    for key, value in data.items():
        match = title_pattern.match(key)
        if not match:
            continue
        code = clean_code(match.group(1))
        if code not in records:
            continue
        title = clean_text(value)
        if ":" in title:
            _, title = title.split(":", 1)
        if title:
            records[code]["course_name"] = clean_text(title)
        prereq_key = f"course_{match.group(1)}_prerequisite"
        prereq_value = clean_text(data.get(prereq_key))
        if prereq_value:
            records[code]["raw_prerequisite"] = prereq_value


def build_name_to_code(records):
    aliases = {}
    for code, record in records.items():
        aliases[normalize_name(record["course_name"])] = code
        aliases[normalize_name(record["course_name"].replace("-", " "))] = code

    aliases.update(
        {
            "project 1": "PC401",
            "project 2": "PC402",
            "project 1 1": "PC401",
            "project 2 2": "PC402",
            "graduation project 1": "PC401",
            "graduation project 2": "PC402",
            "programming language": "CS112",
            "object oriented programming": "CS215",
            "data structure": "CS216",
            "data structures": "CS216",
            "mathematics 1": "MA111",
            "mathematics 2": "MA113",
            "mathematics 3": "MA214",
            "discrete math": "MA112",
            "creative and scientific thinking": "HU112",
            "creative thinking and communication skills": "HU112",
            "introduction to computers": "IT110",
            "logic design": "IT113",
            "micro controller": "IT343",
            "micro controllers": "IT343",
            "networking fundamentals lab": "LB211",
            "network routing and switching lab": "LB312",
            "ethical hacking lab": "LB313",
            "algorithms analysis and design": "CS341",
            "software design and architecture": "CS446",
            "semantic web and technology": "AI435",
            "semantic web and ontology": "AI435",
            "natural language processing": "AI448",
            "image processing": "IT428",
            "cloud computing networking": "IT436",
            "cloud computing networks": "IT436",
            "selected topics in software engineering": "CS447",
            "selected topics in computer networks": "IT437",
            "selected topics in embedded systems": "IT427",
            "software testing and qa": "CS445",
            "fundamental of management": "HU402",
            "fundamentals of management": "HU402",
            "computer organization": "CS318",
            "operating systems": "CS319",
            "artificial intelligence": "AI311",
            "machine learning fundamentals": "AI321",
            "pattern recognition": "IT322",
            "information computer networks security": "IT333",
            "advanced software engineering": "CS344",
            "communication technology": "IT438",
            "wireless and mobile networks": "IT439",
        }
    )
    return aliases


def split_prerequisites(raw_text):
    text = clean_text(raw_text)
    if not text or text.lower() in {"none", "based on selected course"}:
        return []
    return [part.strip() for part in re.split(r",| and ", text) if part.strip()]


def resolve_prerequisites(records):
    aliases = build_name_to_code(records)
    for code, record in records.items():
        resolved = []
        for item in split_prerequisites(record.get("raw_prerequisite", "")):
            if re.search(r"passing\s+\d+\s+credit\s+hours", item, re.IGNORECASE):
                resolved.append(re.sub(r"\s+", " ", item.title().replace("Credit Hours", "Credit Hours")))
                continue
            normalized = normalize_name(item)
            if normalized in aliases:
                resolved.append(aliases[normalized])
        if code == "PC401" and "Passing 85 Credit Hours" not in resolved:
            resolved.append("Passing 85 Credit Hours")
        if code == "PC402":
            if "Passing 85 Credit Hours" not in resolved:
                resolved.append("Passing 85 Credit Hours")
            if "PC401" not in resolved:
                resolved.append("PC401")
        record["prerequisites"] = list(dict.fromkeys(resolved))
        record.pop("raw_prerequisite", None)


def build_policy(data):
    return {
        "program_name": clean_text(data.get("document_title_english")) or "Bachelor Degree Program In Information Technology",
        "total_credit_hours_required_for_graduation": int(data.get("bachelor_degree_required_credit_hours", 135)),
        "level_thresholds": [
            {"max_exclusive": int(data.get("article_13_level_1_credit_hours_threshold", 30)), "label": "First Level"},
            {"max_exclusive": int(data.get("article_13_level_3_credit_hours_threshold", 63)), "label": "Second Level"},
            {"max_exclusive": int(data.get("article_13_level_4_credit_hours_threshold", 96)), "label": "Third Level"},
            {"max_exclusive": None, "label": "Fourth Level"},
        ],
        # Distribution budgets reconciled against the actual catalog
        # totals. The bylaw raw-OCR fields (article_16_*_credit_hours)
        # had inflated values for Math_And_Basic_Sciences (24 vs catalog
        # 21) and Basic_Computer_Science (39 vs catalog 36). The
        # graduation-rules JSON agrees with the catalog values, so we
        # pin the defaults to the consistent set.
        "distribution": {
            "General_Requirements - Mandatory": int(data.get("article_16_general_requirements_mandatory_humanities_social_credit_hours", 6)),
            "General_Requirements - Elective": int(data.get("article_16_general_requirements_elective_humanities_social_credit_hours", 6)),
            # Bylaw Article 16 (PDF page 8): Faculty Requirements = 63 hrs,
            # split into Math/Sciences = 24 hrs + Basic CS = 39 hrs.
            "Math_And_Basic_Sciences": 24,
            "Basic_Computer_Science": 39,
            "Applied_Sciences - Mandatory": int(data.get("specialization_requirements_applied_sciences_mandatory_hours", 27)),
            "Applied_Sciences - Elective": int(data.get("specialization_requirements_applied_sciences_elective_hours", 15)),
            "Graduation_Project": int(data.get("specialization_requirements_project_hours", 6)),
            "Specialized_Labs": int(data.get("specialization_requirements_specialized_labs_hours", 10)),
            "Training_Field": int(data.get("specialization_requirements_training_hours", 2)),
        },
        "credit_hour_limits": {
            "regular": {
                "min_credit_hours": int(data.get("min_credit_hours_main_semesters", 9)),
                "max_credit_hours": int(data.get("max_credit_hours_main_semesters", 18)),
                "max_credit_hours_with_graduation_approval": int(data.get("max_credit_hours_main_semesters_with_approval_for_graduation", 21)),
            },
            "summer": {
                "min_credit_hours": 0,
                "max_credit_hours": int(data.get("max_credit_hours_summer_semester", 9)),
                "max_credit_hours_with_graduation_approval": int(data.get("max_credit_hours_summer_semester_with_approval_for_graduation", 12)),
            },
        },
        "auto_expected_to_graduate_levels": ["Fourth Level"],
        "outside_department_max": 2,
        # Bylaw text uses inclusive "GPA <= 1.0" for the 12-hr band, so
        # 1.0 itself maps to 12 hours. The 15-hr band starts strictly
        # above 1.0.
        "gpa_credit_caps": [
            {"min_gpa": 0.0, "max_gpa_inclusive": 1.0, "max_credit_hours": 12},
            {"min_gpa_exclusive": 1.0, "max_gpa_exclusive": 2.0, "max_credit_hours": 15},
            {"min_gpa": 2.0, "max_gpa_exclusive": None, "max_credit_hours": None},
        ],
    }


def normalize_generated_course(record):
    return {
        "code": record["code"],
        "course_name": record["course_name"],
        "credit_hours": int(record["credit_hours"]),
        "distribution_category": record["distribution_category"],
        "type": record["type"],
        "prerequisites": record.get("prerequisites", []),
        "Term": record.get("Term", []),
        "department": record.get("department", "null"),
        "level": record.get("level", ""),
    }


def build_courses(data):
    records = {}

    parse_full_group(data, records, "first_year_first_semester_course", "First", "First Year")
    parse_full_group(data, records, "first_year_second_semester_course", "Second", "First Year")
    parse_full_group(data, records, "second_year_first_semester_course", "First", "Second Year")
    parse_full_group(data, records, "second_year_second_semester_course", "Second", "Second Year")

    parse_sparse_group(data, records, "first_semester_course_code", "first_semester_course_name", "first_semester_prerequisite", "First", "Third Year")
    parse_sparse_group(data, records, "second_semester_course_code", "second_semester_course_name", "second_semester_prerequisite", "Second", "Third Year")

    parse_full_group(data, records, "first_semester_course", "First", "Fourth Year")
    parse_full_group(data, records, "second_semester_course", "Second", "Fourth Year")

    add_course_record(records, data.get("page33_course_code_1"), data.get("page33_course_name_1"), 2, "Second", "Third Year", data.get("page33_prerequisite_1"))
    add_course_record(records, "TR211", "Field Training", 2, "Summer", "Third Year", "Passing 60 Credit Hours")

    apply_course_overrides(data, records)
    resolve_prerequisites(records)

    return sorted((normalize_generated_course(record) for record in records.values()), key=lambda item: item["code"])


def build_prerequisite_graph(courses):
    prerequisites = {course["code"]: list(course.get("prerequisites", [])) for course in courses}
    dependents = defaultdict(list)
    for course in courses:
        for prerequisite in course.get("prerequisites", []):
            if prerequisite.startswith("Passing"):
                continue
            dependents[prerequisite].append(course["code"])
    return {
        "prerequisites": prerequisites,
        "dependents": {key: sorted(value) for key, value in dependents.items()},
    }


def preprocess_bylaws(force=False):
    if not BYLAW_PATH.exists():
        raise FileNotFoundError(f"Bylaw source file not found: {BYLAW_PATH}")

    data = load_bylaw_data()
    policy = build_policy(data)
    courses = build_courses(data)
    graph = build_prerequisite_graph(courses)

    POLICY_PATH.write_text(json.dumps(policy, indent=2), encoding="utf-8")
    COURSES_PATH.write_text(json.dumps(courses, indent=2), encoding="utf-8")
    GRAPH_PATH.write_text(json.dumps(graph, indent=2), encoding="utf-8")
    return {"policy": policy, "courses": courses, "graph": graph, "forced": force}


def ensure_preprocessed_data(force=False):
    outputs = [POLICY_PATH, COURSES_PATH, GRAPH_PATH]
    if force or any(not path.exists() for path in outputs):
        preprocess_bylaws(force=force)
        return

    source_mtime = BYLAW_PATH.stat().st_mtime
    if any(path.stat().st_mtime < source_mtime for path in outputs):
        preprocess_bylaws(force=force)


if __name__ == "__main__":
    result = preprocess_bylaws(force=True)
    print(f"Generated {len(result['courses'])} courses from {BYLAW_PATH.name}")
