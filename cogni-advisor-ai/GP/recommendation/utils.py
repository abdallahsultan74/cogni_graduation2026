from collections import defaultdict
import json
from pathlib import Path
import re

from .preprocess_bylaws import ensure_preprocessed_data


BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
POLICY_PATH = DATA_DIR / "policy.json"
COURSES_PATH = DATA_DIR / "courses.json"
GRAPH_PATH = DATA_DIR / "prerequisite_graph.json"


def load_policy():
    ensure_preprocessed_data()
    with POLICY_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_courses():
    ensure_preprocessed_data()
    with COURSES_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def load_prerequisite_graph():
    ensure_preprocessed_data()
    with GRAPH_PATH.open(encoding="utf-8") as handle:
        return json.load(handle)


def normalize_term_values(term_value):
    if term_value is None:
        return []
    if isinstance(term_value, list):
        return [str(value).strip() for value in term_value if str(value).strip()]
    term_text = str(term_value).strip()
    return [term_text] if term_text else []


def normalize_course(course):
    normalized = dict(course)
    normalized["Term"] = normalize_term_values(normalized.get("Term", normalized.get("term")))
    normalized["prerequisites"] = list(normalized.get("prerequisites", []))
    normalized["department"] = str(normalized.get("department", "null"))
    normalized["distribution_category"] = normalized.get("distribution_category", "")
    normalized["type"] = normalized.get("type", "Mandatory")
    normalized["credit_hours"] = int(normalized.get("credit_hours", 0))
    return normalized


def normalize_courses(courses):
    return [normalize_course(course) for course in courses]


def is_course_offered_in_term(course, term):
    terms = normalize_term_values(course.get("Term", course.get("term")))
    return "All" in terms or term in terms


def determine_level(total_credits, policy=None):
    policy = policy or load_policy()
    thresholds = policy.get("level_thresholds", [])
    for threshold in thresholds:
        max_exclusive = threshold.get("max_exclusive")
        if max_exclusive is None or total_credits < max_exclusive:
            return threshold["label"]
    return thresholds[-1]["label"] if thresholds else "Unknown"


def fetch_all_courses():
    return load_courses()


def topological_sort(course_ids, graph):
    visited, temp, order = set(), set(), []

    def visit(node):
        if node in temp:
            return
        if node not in visited:
            temp.add(node)
            for prerequisite in graph.get(node, []):
                visit(prerequisite)
            temp.remove(node)
            visited.add(node)
            order.append(node)

    for course_id in course_ids:
        visit(course_id)
    return [course_id for course_id in order if course_id in course_ids]


def satisfies_prereq(prerequisite, completed_ids, total_completed_hours):
    if not prerequisite.startswith("Passing"):
        return prerequisite in completed_ids
    match = re.search(r"Passing\s+(\d+)", prerequisite)
    if match:
        return total_completed_hours >= int(match.group(1))
    return False


def count_locked_courses(course_id, reverse_graph):
    locked = set()

    def dfs(node):
        for downstream in reverse_graph.get(node, []):
            if downstream not in locked:
                locked.add(downstream)
                dfs(downstream)

    dfs(course_id)
    return len(locked)


def course_priority(course, reverse_graph, term):
    score = 1000 if course["type"] == "Mandatory" else 100
    terms = normalize_term_values(course.get("Term"))

    # Term-mismatch is filtered upstream in filter_remaining_courses, so the
    # remaining cases are: exact term match, or "All" term courses.
    if term in terms:
        score += 500
    elif "All" in terms:
        score += 200

    score += count_locked_courses(course["code"], reverse_graph) * 20
    return score


def _category_for(course):
    if course["distribution_category"] in ("General_Requirements", "Applied_Sciences"):
        return f"{course['distribution_category']} - {course['type'].capitalize()}"
    return course["distribution_category"]


def csp_select(eligible, reverse_graph, prerequisite_graph, credit_limit, deficits, term):
    """Pick a deficit-driven course set inside the credit cap.

    Score is ``(categories_satisfied, -gap_to_cap, sorted_codes)``:
    1. Satisfy as many distribution categories as possible.
    2. Land as close to the credit cap as possible without exceeding it.
    3. Break ties deterministically by sorted course codes so identical
       inputs always produce identical outputs and distinct students do
       not collapse to the same selection.
    """
    eligible = sorted(eligible, key=lambda course: (-course_priority(course, reverse_graph, term), course["code"]))

    best: list[dict] = []
    # Initial best_state is "worst possible": no categories satisfied, far from cap, lex-large codes
    best_state = (-1, -10**9, ("￿",))

    def score(current_deficits, used_credit_hours, chosen):
        satisfied = sum(1 for value in current_deficits.values() if value <= 0)
        # Closer to cap is better but never over (overflow already pruned by caller).
        gap = -abs(credit_limit - used_credit_hours)
        # Sorted codes as tie-breaker (lower = preferred — earlier alphabetically).
        codes = tuple(sorted(course["code"] for course in chosen)) or ("￿",)
        return (satisfied, gap, codes)

    def backtrack(index, used_credit_hours, current_deficits, chosen):
        nonlocal best, best_state
        if used_credit_hours > credit_limit:
            return

        current = score(current_deficits, used_credit_hours, chosen)
        # For deterministic min-tie-break we invert codes: smaller codes preferred.
        # Compare in this order: prefer more satisfied; then smaller gap-to-cap;
        # then lexicographically smaller code tuple.
        if (current[0] > best_state[0]
                or (current[0] == best_state[0] and current[1] > best_state[1])
                or (current[0] == best_state[0] and current[1] == best_state[1] and current[2] < best_state[2])):
            best_state = current
            best = chosen.copy()

        if all(value <= 0 for value in current_deficits.values()) or index >= len(eligible):
            return

        course = eligible[index]
        credit_hours = course["credit_hours"]
        category = _category_for(course)

        if current_deficits.get(category, 0) > 0:
            next_deficits = current_deficits.copy()
            next_deficits[category] = max(next_deficits[category] - credit_hours, 0)
            chosen.append(course)
            backtrack(index + 1, used_credit_hours + credit_hours, next_deficits, chosen)
            chosen.pop()
        backtrack(index + 1, used_credit_hours, current_deficits, chosen)

    backtrack(0, 0, deficits, [])
    sorted_ids = topological_sort([course["code"] for course in best], prerequisite_graph)
    id_map = {course["code"]: course for course in eligible}
    return [id_map[course_id] for course_id in sorted_ids]


# Default GPA bands when policy does not carry them. Pulled from the
# Rules For general bylaw section (rule ids 1-4): GPA<1.0 → 12, 1.0≤GPA<2.0
# → 15, GPA≥2.0 → 18 (or 21 with graduation approval).
DEFAULT_GPA_CAPS = [
    {"min_gpa": 0.0, "max_gpa_inclusive": 1.0, "max_credit_hours": 12},
    {"min_gpa_exclusive": 1.0, "max_gpa_exclusive": 2.0, "max_credit_hours": 15},
    {"min_gpa": 2.0, "max_gpa_exclusive": None, "max_credit_hours": None},  # use semester max
]


def _resolve_gpa_cap(gpa, semester_max, policy):
    bands = policy.get("gpa_credit_caps", DEFAULT_GPA_CAPS)
    try:
        gpa_value = float(gpa) if gpa is not None else None
    except (TypeError, ValueError):
        gpa_value = None
    if gpa_value is None:
        return semester_max
    for band in bands:
        # Lower bound — inclusive by default; switches to exclusive when
        # max_gpa_inclusive on the previous band would otherwise overlap.
        if "min_gpa_exclusive" in band:
            if not gpa_value > band["min_gpa_exclusive"]:
                continue
        else:
            if not gpa_value >= band.get("min_gpa", 0.0):
                continue
        # Upper bound — inclusive variant wins when present.
        if "max_gpa_inclusive" in band:
            if not gpa_value <= band["max_gpa_inclusive"]:
                continue
        elif band.get("max_gpa_exclusive") is not None:
            if not gpa_value < band["max_gpa_exclusive"]:
                continue
        cap = band.get("max_credit_hours")
        return cap if cap is not None else semester_max
    return semester_max


def determine_credit_limit(gpa, expected_to_graduate, semester, remaining_credit_hours, policy=None):
    """Return the actual credit cap for this term, GPA-aware.

    Order of precedence:
    1. ``remaining_credit_hours`` is the hard ceiling — never recommend
       more than what the student needs to graduate.
    2. ``min_credit_hours`` from policy is the floor unless the student
       has fewer remaining hours than the floor (final term).
    3. The semester max from policy bounds normal terms; the
       graduation-approval cap raises it when ``expected_to_graduate``.
    4. The GPA band caps the result downward when GPA is below 2.0.
    """
    policy = policy or load_policy()
    semester_rules = policy.get("credit_hour_limits", {})
    limits = semester_rules.get(str(semester).lower(), semester_rules.get("regular", {}))

    min_credit_hours = int(limits.get("min_credit_hours", 0))
    semester_max = int(limits.get("max_credit_hours", 0))
    graduation_cap = int(limits.get("max_credit_hours_with_graduation_approval", semester_max))

    cap = graduation_cap if expected_to_graduate else semester_max
    cap = min(cap, _resolve_gpa_cap(gpa, cap, policy))

    if remaining_credit_hours <= 0:
        return 0
    if remaining_credit_hours < min_credit_hours:
        return remaining_credit_hours
    return min(cap, remaining_credit_hours)


def compute_deficits(completed_courses, student_department, policy=None):
    policy = policy or load_policy()
    requirements = policy.get("distribution", {})
    accumulated = {key: 0 for key in requirements}

    for course in completed_courses:
        course_department = str(course.get("department", "null"))
        is_mandatory = course["type"].lower() == "mandatory"

        # Mandatory courses from a different department do not satisfy
        # this student's distribution. Electives may, since electives are
        # student-chosen across departments.
        if is_mandatory and course_department not in (student_department, "null"):
            continue

        composite_key = f"{course['distribution_category']} - {course['type'].capitalize()}"
        bare_key = course["distribution_category"]

        if composite_key in accumulated:
            accumulated[composite_key] += course["credit_hours"]
        elif bare_key in accumulated:
            accumulated[bare_key] += course["credit_hours"]

    return {key: max(value - accumulated.get(key, 0), 0) for key, value in requirements.items()}


class AcademicAdvisor:
    @staticmethod
    def determine_level(total_credits):
        return determine_level(total_credits)

    def __init__(self, student_id, gpa, expected_to_graduate, semester, term, department, completed_course_details=None, all_courses=None):
        self.student_id = student_id
        self.gpa = gpa
        self.expected_to_graduate = expected_to_graduate
        self.semester = semester
        self.term = term
        self.department = department
        self.policy = load_policy()
        self.graph_bundle = load_prerequisite_graph()
        self.prerequisite_graph = self.graph_bundle.get("prerequisites", {})
        self.reverse_graph = self.graph_bundle.get("dependents", {})

        completed_source = completed_course_details if completed_course_details is not None else []
        all_courses_source = all_courses if all_courses is not None else fetch_all_courses()

        self.completed_courses = normalize_courses(completed_source)
        self.all_courses = normalize_courses(all_courses_source)
        self.completed_ids = [course["code"] for course in self.completed_courses]
        self.total_completed_hours = sum(course["credit_hours"] for course in self.completed_courses)

        # Defensive integrity check: if the catalog ever ships a graduation
        # project record with no prerequisites, recommendations could leak
        # PC401 to first-year students. Patch in the bylaw-mandated rule
        # rather than failing — the data file may be regenerated mid-run.
        for course in self.all_courses:
            if course["code"] in {"PC401", "PC402"} and not course["prerequisites"]:
                course["prerequisites"] = (
                    ["Passing 85 Credit Hours"]
                    if course["code"] == "PC401"
                    else ["Passing 85 Credit Hours", "PC401"]
                )

        student_level = determine_level(self.total_completed_hours, self.policy)
        if student_level in set(self.policy.get("auto_expected_to_graduate_levels", [])):
            self.expected_to_graduate = True

        self.remaining = self.filter_remaining_courses()
        self.eligible = self.get_eligible_courses()
        # Cap the credit limit by the *graduation gap* — total required minus
        # what's already done — not by the sum of this-term-remaining
        # courses. The latter collapsed the cap to whatever happened to be
        # offered for the student's track this term, which made AI students
        # with sparse first-term catalog get a 2-hour cap and an empty
        # core list.
        total_required = int(self.policy.get("total_credit_hours_required_for_graduation", 0))
        graduation_gap = max(total_required - self.total_completed_hours, 0)
        self.credit_limit = determine_credit_limit(
            self.gpa,
            self.expected_to_graduate,
            self.semester,
            graduation_gap,
            policy=self.policy,
        )
        self.deficits = compute_deficits(self.completed_courses, self.department, policy=self.policy)

        if self.department in ["null", "none", ""]:
            self.eligible = [
                course for course in self.eligible
                if course["distribution_category"] not in {"Applied_Sciences", "Graduation_Project", "Specialized_Labs", "Training_Field"}
            ]

    def get_available_outside_department_courses(self):
        elective_course_codes = {course["code"] for course in self.get_eligible_courses() if course["type"] == "Elective"}
        seen_codes = set()
        available = []

        for course in self.all_courses:
            code = course["code"]
            if code in self.completed_ids or code in elective_course_codes or code in seen_codes:
                continue
            if not is_course_offered_in_term(course, self.term):
                continue

            course_department = str(course.get("department", "null"))
            is_outside_department = course_department != self.department and course_department != "null"
            if not is_outside_department or course["distribution_category"] == "Graduation_Project":
                continue

            prerequisites = course.get("prerequisites", [])
            if all(satisfies_prereq(prerequisite, self.completed_ids, self.total_completed_hours) for prerequisite in prerequisites):
                available.append(course)
                seen_codes.add(code)
        return available

    def filter_remaining_courses(self):
        return [
            course for course in self.all_courses
            if course["code"] not in self.completed_ids
            and is_course_offered_in_term(course, self.term)
            and not (
                course["distribution_category"] in ("Applied_Sciences", "Graduation_Project", "Specialized_Labs")
                and str(course.get("department", "null")) not in (self.department, "null")
            )
        ]

    def get_eligible_courses(self):
        eligible = []
        for course in self.remaining:
            if all(
                satisfies_prereq(prerequisite, self.completed_ids, self.total_completed_hours)
                for prerequisite in course.get("prerequisites", [])
            ):
                eligible.append(course)
        return eligible

    def suggest_core_courses(self):
        core_eligible = [course for course in self.eligible if course["type"] != "Elective"]
        return csp_select(
            core_eligible,
            self.reverse_graph,
            self.prerequisite_graph,
            self.credit_limit,
            self.deficits,
            self.term,
        )

    def _next_planning_term(self) -> str:
        """Return the term that follows the one being planned.

        First → Second, Second → First (next academic year), Summer → First.
        Used to look ahead at what mandatories the student will face after
        the current plan, so the dashboard can show a "Coming next term"
        queue instead of letting senior students think they have nothing
        left to take.
        """
        flow = {"First": "Second", "Second": "First", "Summer": "First"}
        return flow.get(self.term, "Second")

    def upcoming_mandatories(self) -> list[dict]:
        """Mandatory courses the student is eligible for *now* but that are
        offered in the next term, not the one currently being planned.

        Department-filtered the same way `filter_remaining_courses` does
        so AI/IT students see their own track. Sorted by code for stable
        rendering. Eligibility uses today's `completed_ids` — we don't
        try to model "what becomes eligible after they finish this term"
        because that's a different feature; this card answers the
        narrower question "what's queued for me next semester?"
        """
        next_term = self._next_planning_term()
        upcoming: list[dict] = []
        for course in self.all_courses:
            if course["code"] in self.completed_ids:
                continue
            if course["type"] == "Elective":
                continue
            terms = normalize_term_values(course.get("Term"))
            if next_term not in terms and "All" not in terms:
                continue
            # Same department gate as filter_remaining_courses.
            if (course["distribution_category"] in ("Applied_Sciences", "Graduation_Project", "Specialized_Labs")
                    and str(course.get("department", "null")) not in (self.department, "null")):
                continue
            if not all(satisfies_prereq(p, self.completed_ids, self.total_completed_hours)
                       for p in course.get("prerequisites", [])):
                continue
            upcoming.append(course)
        upcoming.sort(key=lambda c: c["code"])
        return upcoming

    def suggest_electives(self, remaining_credit_capacity):
        """Recommend elective courses driven by real deficits and per-course credit hours.

        - When the deficit for a category is zero or negative, recommend zero
          electives there. The previous implementation forced minimum slots
          even at zero deficit.
        - Each candidate's actual ``credit_hours`` is consumed; the previous
          implementation hardcoded 2 (general) and 3 (applied) hours per
          elective regardless of the course's real weight.
        - Greedy-pick by lowest credit hours first so a student near the cap
          can fit one more small elective.
        """
        result = {}

        def pick_elective(category, available_credits):
            deficit = max(int(self.deficits.get(f"{category} - Elective", 0)), 0)
            options = sorted(
                (
                    course for course in self.eligible
                    if course["distribution_category"] == category and course["type"] == "Elective"
                ),
                key=lambda course: (course["credit_hours"], course["code"]),
            )

            picked: list[dict] = []
            credit_used = 0
            for course in options:
                if deficit <= 0 or credit_used >= available_credits:
                    break
                hours = int(course["credit_hours"])
                if hours <= 0:
                    continue
                if credit_used + hours > available_credits:
                    continue
                picked.append(course)
                credit_used += hours
                deficit -= hours

            return len(picked), options, credit_used

        budget = max(int(remaining_credit_capacity), 0)
        general_slots, general_options, used_general = pick_elective("General_Requirements", budget)
        applied_slots, applied_options, used_applied = pick_elective(
            "Applied_Sciences", budget - used_general
        )

        result["General"] = general_slots
        result["GeneralOptions"] = general_options
        result["Applied"] = applied_slots
        result["AppliedOptions"] = applied_options
        result["TotalElectives"] = general_slots + applied_slots
        result["UsedElectiveCredits"] = used_general + used_applied
        return result

    def run(self):
        student_level = determine_level(self.total_completed_hours, self.policy)
        total_credit_hours_required = int(self.policy.get("total_credit_hours_required_for_graduation", 0))
        total_remaining = total_credit_hours_required - self.total_completed_hours

        core_courses = self.suggest_core_courses()
        distribution = {}
        for course in self.remaining:
            category = course["distribution_category"]
            distribution[category] = distribution.get(category, 0) + course["credit_hours"]

        electives = self.suggest_electives(self.credit_limit - sum(course["credit_hours"] for course in core_courses))
        remaining_mandatory = [course for course in self.remaining if course["type"] == "Mandatory" and course not in self.eligible]
        ineligible_courses = []
        for course in remaining_mandatory:
            missing_prereqs = [
                prerequisite for prerequisite in course.get("prerequisites", [])
                if not satisfies_prereq(prerequisite, self.completed_ids, self.total_completed_hours)
            ]
            if missing_prereqs:
                ineligible_courses.append({
                    "code": course["code"],
                    "course_name": course.get("course_name", course["code"]),
                    "missing_prereqs": ", ".join(missing_prereqs),
                    # Back-compat with prior API consumers
                    "CourseCode": course["code"],
                    "MissingPrereqs": ", ".join(missing_prereqs),
                })

        def _course_summary(course):
            return {
                "code": course["code"],
                "course_name": course.get("course_name", course["code"]),
                "credit_hours": course["credit_hours"],
                "distribution_category": course.get("distribution_category", ""),
                "type": course.get("type", "Mandatory"),
                "level": course.get("level", ""),
            }

        core_summaries = [_course_summary(course) for course in core_courses]
        general_options = [_course_summary(course) for course in electives.get("GeneralOptions", [])]
        applied_options = [_course_summary(course) for course in electives.get("AppliedOptions", [])]

        student_summary = {
            "student_id": self.student_id,
            "academic_level": student_level,
            "current_term": self.term,
            "department": self.department,
            "gpa": self.gpa,
            "total_completed_hours": self.total_completed_hours,
            "total_remaining": total_remaining,
            "credit_limit": self.credit_limit,
            # Back-compat keys (PascalCase) preserved for the existing JSON API consumers.
            "AcademicLevel": student_level,
            "CreditLimit": self.credit_limit,
            "CurrentTerm": self.term,
            "Department": self.department,
            "Gpa": self.gpa,
            "StudentId": self.student_id,
            "TotalCompletedHours": self.total_completed_hours,
            "TotalRemaining": total_remaining,
        }

        result = {
            "core_courses": core_summaries,
            "core_course_codes": [course["code"] for course in core_courses],
            "distribution": distribution,
            "electives": {
                "Applied": electives.get("Applied", 0),
                "AppliedOptions": applied_options,
                "General": electives.get("General", 0),
                "GeneralOptions": general_options,
                "TotalElectives": electives.get("TotalElectives", 0),
                "UsedElectiveCredits": electives.get("UsedElectiveCredits", 0),
            },
            "ineligible_courses": ineligible_courses,
            "remaining_requirements": {},
            "student_summary": student_summary,
            "total_core_credits": sum(course["credit_hours"] for course in core_courses),
            "coming_next_term": {
                "term": self._next_planning_term(),
                "courses": [_course_summary(c) for c in self.upcoming_mandatories()],
            },
        }

        if self.department not in ["null", "none", ""]:
            outside_completed = [
                course for course in self.completed_courses
                if str(course.get("department", "null")) not in (self.department, "null")
            ]
            outside_max = int(self.policy.get("outside_department_max", 2))
            can_take_outside = max(0, outside_max - len(outside_completed))
            available_outside = [_course_summary(course) for course in self.get_available_outside_department_courses()]
            result["outside_dept"] = {
                "available_outside": available_outside,
                "can_take_outside": can_take_outside,
                "num_outside_dept_taken": len(outside_completed),
                # Back-compat
                "AvailableOutside": [c["code"] for c in available_outside],
                "CanTakeOutside": can_take_outside,
                "NumOutsideDeptTaken": len(outside_completed),
            }

        for category, deficit in self.deficits.items():
            key = category.replace("_", " ")
            result["remaining_requirements"][key] = f"{deficit} credits remaining" if deficit > 0 else "Fulfilled"
        result["remaining_requirements"]["Total Credits Remaining"] = str(total_remaining)

        return result
