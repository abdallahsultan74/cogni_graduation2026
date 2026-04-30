import os
from collections import OrderedDict
from datetime import datetime, timezone

from flask import render_template, request, jsonify

from . import recommendation_bp
from . import repository
from .llm_summary import summarize_recommendation
from .utils import AcademicAdvisor, fetch_all_courses, load_policy


def _maybe_summarize(result, term):
    """Run the LLM advisor summary only when the feature flag is on.

    Set ``EELU_AI_SUMMARY=1`` to re-enable. Default is off because the
    summary makes a third-party API call on every render and the rest
    of the dashboard already gives the student everything the model
    would say."""
    if os.environ.get("EELU_AI_SUMMARY", "0") != "1":
        return None
    return summarize_recommendation(result, term)


def _build_optional_pool(result):
    """Flatten the per-source elective lists into one ranked candidate
    pool. Each entry carries the bylaw bucket it would chip into so the
    UI can tag and the promoter can prioritize within-track first."""
    pool = []
    for c in (result.get("electives", {}).get("GeneralOptions") or []):
        pool.append({
            "code": c["code"], "course_name": c["course_name"], "credit_hours": c["credit_hours"],
            "tag": "General elective", "tag_class": "tag-general", "outside": False,
        })
    for c in (result.get("electives", {}).get("AppliedOptions") or []):
        pool.append({
            "code": c["code"], "course_name": c["course_name"], "credit_hours": c["credit_hours"],
            "tag": "Applied elective", "tag_class": "tag-applied", "outside": False,
        })
    od = result.get("outside_dept") or {}
    if int(od.get("can_take_outside", 0)) > 0:
        for c in (od.get("available_outside") or []):
            pool.append({
                "code": c["code"], "course_name": c["course_name"], "credit_hours": c["credit_hours"],
                "tag": "Outside dept", "tag_class": "tag-outside", "outside": True,
            })
    return pool


def _promote_to_register_min(core_hrs, optional_pool, min_hrs, cap):
    """Greedy-promote optional courses until the total registration meets
    the bylaw-mandated per-term minimum.

    Sort key prioritizes within-track electives first, then smallest credit
    hours, then deterministic course-code order. Outside-department courses
    are last resort because they're discretionary cross-track picks. We
    never overshoot the cap.

    Returns ``(promoted, remaining)``. The promoted list is empty when
    ``core_hrs >= min_hrs``.
    """
    if core_hrs >= min_hrs or not optional_pool:
        return [], list(optional_pool)

    sorted_pool = sorted(
        optional_pool,
        key=lambda c: (1 if c.get("outside") else 0, int(c["credit_hours"]), c["code"]),
    )

    promoted = []
    promoted_codes = set()
    total = core_hrs
    for course in sorted_pool:
        if total >= min_hrs:
            break
        hrs = int(course["credit_hours"])
        if total + hrs > cap:
            continue  # would push us over the GPA/semester cap
        promoted.append(course)
        promoted_codes.add(course["code"])
        total += hrs

    remaining = [c for c in optional_pool if c["code"] not in promoted_codes]
    return promoted, remaining


def _registration_view(result, term):
    """Compose the Required + Optional view the dashboard renders.

    The bylaw min for First/Second is 9; Summer has no min. If the
    student is in their final term (remaining-to-graduate < min) the
    rule is waived.
    """
    summary = result.get("student_summary", {}) or {}
    cap = int(summary.get("credit_limit", 0))
    core_hrs = int(result.get("total_core_credits", 0))
    is_regular = term in ("First", "Second")
    min_hrs = 9 if is_regular else 0
    final_term = int(summary.get("total_remaining", 0)) < min_hrs

    optional_pool = _build_optional_pool(result)
    if final_term or min_hrs == 0:
        promoted = []
        remaining = optional_pool
    else:
        promoted, remaining = _promote_to_register_min(core_hrs, optional_pool, min_hrs, cap)

    promoted_hrs = sum(int(c["credit_hours"]) for c in promoted)
    return {
        "min_hrs": min_hrs,
        "is_final_term": final_term,
        "core_hrs": core_hrs,
        "promoted": promoted,
        "promoted_hrs": promoted_hrs,
        "required_total_hrs": core_hrs + promoted_hrs,
        "optional": remaining,
        "headroom_hrs": max(cap - core_hrs - promoted_hrs, 0),
    }


_LEVEL_ORDER = ["First Year", "Second Year", "Third Year", "Fourth Year", "Other"]


def _catalog_by_level():
    """Return the catalog grouped by year-level for the form's multi-select."""
    catalog = fetch_all_courses()
    grouped = OrderedDict((label, []) for label in _LEVEL_ORDER)
    for course in catalog:
        label = course.get("level") or "Other"
        if label not in grouped:
            grouped["Other"].append(course)
        else:
            grouped[label].append(course)
    for items in grouped.values():
        items.sort(key=lambda c: (c.get("Term", [""])[0] if c.get("Term") else "", c["code"]))
    # Drop empty groups so the template doesn't render orphan headers
    return OrderedDict((k, v) for k, v in grouped.items() if v)


def _resolve_completed(completed_codes, catalog):
    by_code = {course["code"]: course for course in catalog}
    return [by_code[code] for code in completed_codes if code in by_code]


def _coerce_term_semester(term, semester):
    """Snap an inconsistent term/semester pair to a coherent state."""
    notice = None
    if semester == "summer" and term != "Summer":
        notice = f"Adjusted Term to “Summer” to match the summer semester."
        term = "Summer"
    elif term == "Summer" and semester != "summer":
        notice = f"Adjusted Semester to “summer” to match the Summer term."
        semester = "summer"
    return term, semester, notice


def _coerce_gpa(raw):
    try:
        gpa = float(raw)
    except (TypeError, ValueError):
        return 0.0, "GPA was not numeric — used 0.00."
    if gpa < 0:
        return 0.0, "GPA was below zero — clamped to 0.00."
    if gpa > 4:
        return 4.0, "GPA was above 4.0 — clamped to 4.00."
    return gpa, None


DEMO_RECOMMENDATION_PAYLOAD = {
    "StudentId": "demo-it-student",
    "DepartmentName": "IT",
    "Term": "First",
    "GPA": 3.1,
    "expected_to_graduate": False,
    "semester": "regular",
    "CompletedCourses": [
        {"code": "IT110", "course_name": "Introduction to Computers", "credit_hours": 3, "distribution_category": "Basic_Computer_Science", "type": "Mandatory", "prerequisites": [], "Term": ["First"], "department": "null"},
        {"code": "MA111", "course_name": "Mathematics-1", "credit_hours": 3, "distribution_category": "Math_And_Basic_Sciences", "type": "Mandatory", "prerequisites": [], "Term": ["First"], "department": "null"},
        {"code": "HU111", "course_name": "Technical Report Writing", "credit_hours": 2, "distribution_category": "General_Requirements", "type": "Mandatory", "prerequisites": [], "Term": ["First"], "department": "null"},
        {"code": "IT111", "course_name": "Electronics", "credit_hours": 3, "distribution_category": "Math_And_Basic_Sciences", "type": "Mandatory", "prerequisites": [], "Term": ["First"], "department": "null"},
        {"code": "MA112", "course_name": "Discrete Math", "credit_hours": 3, "distribution_category": "Math_And_Basic_Sciences", "type": "Mandatory", "prerequisites": [], "Term": ["First"], "department": "null"},
        {"code": "ST121", "course_name": "Probability and Statistics-1", "credit_hours": 3, "distribution_category": "Math_And_Basic_Sciences", "type": "Mandatory", "prerequisites": ["MA111"], "Term": ["Second"], "department": "null"},
        {"code": "HU112", "course_name": "Creative and Scientific Thinking", "credit_hours": 2, "distribution_category": "General_Requirements", "type": "Mandatory", "prerequisites": [], "Term": ["Second"], "department": "null"},
        {"code": "MA113", "course_name": "Mathematics-2", "credit_hours": 3, "distribution_category": "Math_And_Basic_Sciences", "type": "Mandatory", "prerequisites": ["MA111"], "Term": ["Second"], "department": "null"},
        {"code": "HU101", "course_name": "Micro Economics", "credit_hours": 2, "distribution_category": "General_Requirements", "type": "Elective", "prerequisites": [], "Term": ["Second"], "department": "null"},
        {"code": "IT113", "course_name": "Logic Design", "credit_hours": 3, "distribution_category": "Basic_Computer_Science", "type": "Mandatory", "prerequisites": ["IT111"], "Term": ["Second"], "department": "null"},
        {"code": "CS112", "course_name": "Programming Language", "credit_hours": 3, "distribution_category": "Basic_Computer_Science", "type": "Mandatory", "prerequisites": ["IT110"], "Term": ["Second"], "department": "null"}
    ]
}

# app = Flask(__name__)
# CORS(app, origins="*")

def _common_template_kwargs():
    return {
        "catalog_groups": _catalog_by_level(),
        "sample_students": repository.list_sample_students(),
    }


def _export_payload(*, mode, result, term, semester, notices, resolved_student=None, enrollments=None, manual_input=None):
    """Bundle the inputs + result + transcript into a single JSON-friendly dict
    that the front-end downloads as a file for debugging."""
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "mode": mode,
        "input": {
            "student_id": (resolved_student or manual_input or {}).get("student_id"),
            "term": term,
            "semester": semester,
            **(manual_input or {}),
        },
        "resolved_student": resolved_student,
        "enrollments": enrollments or [],
        "notices": notices,
        "result": result,
    }


@recommendation_bp.route('/', methods=['GET', 'POST'])
def recommend():
    catalog = fetch_all_courses()

    if request.method != 'POST':
        return render_template(
            'recommendation.html',
            mode='lookup',
            completed_codes=set(),
            notices=[],
            **_common_template_kwargs(),
        )

    mode = request.form.get('mode', 'lookup')
    notices = []
    term_raw = request.form.get('term', '').strip()
    term_was_explicit = bool(term_raw)
    term = term_raw or 'First'
    semester = request.form.get('semester', 'regular')
    term, semester, term_notice = _coerce_term_semester(term, semester)
    if term_notice:
        notices.append(term_notice)

    if mode == 'lookup':
        student_id = request.form.get('student_id', '').strip()
        if not student_id:
            notices.append("Enter a Student ID to generate a recommendation.")
            return render_template(
                'recommendation.html',
                mode='lookup',
                completed_codes=set(),
                notices=notices,
                **_common_template_kwargs(),
            )

        student = repository.find_student(student_id)
        if student is None:
            return render_template(
                'recommendation.html',
                mode='lookup',
                completed_codes=set(),
                notices=[f"No student found with ID “{student_id}”. Try one of the sample IDs below."],
                lookup_failed=True,
                **_common_template_kwargs(),
            )

        # Auto-detect the next academic term from the student's transcript
        # and use it whenever the form didn't set a term explicitly.
        # This is the entire point of the planning system: recommend for the
        # term that comes NEXT, not whatever term the dropdown happened to
        # default to.
        next_term_info = repository.next_planning_term(student.enrollments)
        if not term_was_explicit:
            term = next_term_info["term"]
            semester = "summer" if term == "Summer" else "regular"
            notices.append(
                f"Planning for {next_term_info['term']}"
                + (f" {next_term_info['year']}" if next_term_info.get('year') else "")
                + f" — {next_term_info['reason']}"
            )

        adv_input = repository.build_advisor_input(student)
        notices.append(
            f"Resolved {student.name} ({student.department}) — "
            f"GPA {adv_input['gpa']:.2f} from {adv_input['graded_enrollment_count']} graded course"
            f"{'s' if adv_input['graded_enrollment_count'] != 1 else ''}, "
            f"{adv_input['total_completed_hours']} completed credit hours, level {adv_input['academic_level']}."
        )

        # Build a richer enrollments view for the "Previous Courses" card.
        catalog_by_code = {c["code"]: c for c in catalog}
        enrollments_view = []
        for e in student.enrollments:
            course = catalog_by_code.get(e.course_code, {})
            enrollments_view.append({
                "code": e.course_code,
                "course_name": course.get("course_name", e.course_code),
                "credit_hours": int(course.get("credit_hours", 0)),
                "grade": e.grade,
                "term_taken": e.term_taken,
                "year_taken": e.year_taken,
                "is_retake": bool(e.is_retake),
                "passed": e.grade != "F",
                "distribution_category": course.get("distribution_category", ""),
            })
        # Sort newest-first so the most recent term is on top and auto-opens.
        # Within a term, sort by code for stable ordering.
        enrollments_view.sort(
            key=lambda x: (
                -int(x["year_taken"]),
                -{"Summer": 3, "Second": 2, "First": 1}.get(x["term_taken"], 0),
                x["code"],
            )
        )

        advisor = AcademicAdvisor(
            adv_input["student_id"],
            adv_input["gpa"],
            adv_input["expected_to_graduate"],
            semester,
            term,
            adv_input["department"],
            completed_course_details=adv_input["completed_course_details"],
        )
        result = advisor.run()
        result["student_summary"]["name"] = student.name
        registration = _registration_view(result, term)
        ai_summary = _maybe_summarize(result, term)

        resolved_student = {
            "student_id": student.student_id,
            "name": student.name,
            "department": student.department,
            "enrolled_year": student.enrolled_year,
            "gpa": adv_input["gpa"],
            "total_completed_hours": adv_input["total_completed_hours"],
            "academic_level": adv_input["academic_level"],
            "expected_to_graduate": adv_input["expected_to_graduate"],
        }
        return render_template(
            'recommendation.html',
            mode='lookup',
            result=result,
            completed_codes={c["code"] for c in adv_input["completed_course_details"]},
            notices=notices,
            resolved_student=resolved_student,
            enrollments=enrollments_view,
            registration=registration,
            ai_summary=ai_summary,
            export_payload=_export_payload(
                mode='lookup',
                result=result,
                term=term,
                semester=semester,
                notices=notices,
                resolved_student=resolved_student,
                enrollments=enrollments_view,
            ),
            **_common_template_kwargs(),
        )

    # ---- What-if (manual) mode ----
    student_id = request.form.get('student_id', '').strip() or 'what-if'
    gpa, gpa_notice = _coerce_gpa(request.form.get('gpa'))
    if gpa_notice:
        notices.append(gpa_notice)
    expected_to_graduate = request.form.get('expected_to_graduate') == 'True'
    department = request.form.get('department', 'IT')
    completed_codes = request.form.getlist('completed[]')
    completed_courses = _resolve_completed(completed_codes, catalog)

    advisor = AcademicAdvisor(
        student_id,
        gpa,
        expected_to_graduate,
        semester,
        term,
        department,
        completed_course_details=completed_courses,
    )
    result = advisor.run()
    registration = _registration_view(result, term)
    ai_summary = _maybe_summarize(result, term)

    manual_input = {
        "student_id": student_id,
        "gpa": gpa,
        "expected_to_graduate": expected_to_graduate,
        "department": department,
        "completed_codes": completed_codes,
    }
    return render_template(
        'recommendation.html',
        mode='manual',
        result=result,
        completed_codes=set(completed_codes),
        notices=notices,
        registration=registration,
        ai_summary=ai_summary,
        export_payload=_export_payload(
            mode='manual',
            result=result,
            term=term,
            semester=semester,
            notices=notices,
            manual_input=manual_input,
        ),
        **_common_template_kwargs(),
    )


@recommendation_bp.route('/api/policy', methods=['GET'])
def api_policy():
    """Expose the bylaw thresholds the form widget needs.

    Lets the front-end stop hardcoding level/GPA bands.
    """
    policy = load_policy()
    return jsonify({
        "level_thresholds": policy.get("level_thresholds", []),
        "gpa_credit_caps": policy.get("gpa_credit_caps", []),
        "credit_hour_limits": policy.get("credit_hour_limits", {}),
        "total_credit_hours_required_for_graduation": policy.get("total_credit_hours_required_for_graduation", 0),
        "outside_department_max": policy.get("outside_department_max", 2),
    })


@recommendation_bp.route('/api/students', methods=['GET'])
def api_students():
    """List the seed students so the UI can render the sample-IDs panel without server-side rendering."""
    return jsonify({"students": repository.list_sample_students()})

@recommendation_bp.route('/api/recommend', methods=['POST'])
def api_recommend():
    try:
        data = request.get_json()

        # 🔻 Extract required fields from backend
        print("Term: ", data['Term'])
        print("Compeleted Courses: ", data['CompletedCourses'])

        student_id = data['StudentId']
        gpa = data['GPA']
        expected_to_graduate = data.get('expected_to_graduate', False)
        semester = data.get('semester',"regular")
        term = data['Term']
        department = data['DepartmentName']
        completed_course_details = data['CompletedCourses']

        # ✅ Override the fetch functions by injecting the data directly
        advisor = AcademicAdvisor(
            student_id,
            gpa,
            expected_to_graduate,
            semester,
            term,
            department,
            completed_course_details=completed_course_details
        )

        result = advisor.run()
        print("result: ", result)
        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


@recommendation_bp.route('/api/recommend/demo', methods=['GET'])
def api_recommend_demo():
    advisor = AcademicAdvisor(
        DEMO_RECOMMENDATION_PAYLOAD["StudentId"],
        DEMO_RECOMMENDATION_PAYLOAD["GPA"],
        DEMO_RECOMMENDATION_PAYLOAD["expected_to_graduate"],
        DEMO_RECOMMENDATION_PAYLOAD["semester"],
        DEMO_RECOMMENDATION_PAYLOAD["Term"],
        DEMO_RECOMMENDATION_PAYLOAD["DepartmentName"],
        completed_course_details=DEMO_RECOMMENDATION_PAYLOAD["CompletedCourses"],
    )
    result = advisor.run()
    return jsonify({
        "payload": DEMO_RECOMMENDATION_PAYLOAD,
        "result": result,
    }), 200
