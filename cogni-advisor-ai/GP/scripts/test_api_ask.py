#!/usr/bin/env python3
"""POST the four Arabic test questions to Flask /chatbot/api/ask."""
from __future__ import annotations

import json
import sys
import urllib.request

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

BASE = "http://127.0.0.1:7860/chatbot/api/ask"
SAMPLE_CONTEXT = {
    "level": 2,
    "major_type": "IT",
    "cumulative_gpa": 2.8,
    "earned_hours": 45,
    "completed_courses": [
        "IT110", "IT111", "MA111", "MA112", "HU111", "HU113",
        "CS112", "MA113", "IT113", "HU112", "ST121", "HU101",
        "CS215", "DS211", "MA214", "IT231", "ST222", "CS240",
    ],
}

TESTS = [
    ("summer-hours", "إيه الحد الأقصى للساعات في الفصل الصيفي؟", None),
    ("year2-term1", "إيه مواد السنة التانية ترم أول؟", None),
    ("attendance", "إيه نسبة الحضور المطلوبة؟", None),
    ("study-plan", "أريد خطة دراسية للفصل القادم", SAMPLE_CONTEXT),
]


def post(question: str, student_context: dict | None) -> str:
    payload: dict = {"question": question}
    if student_context:
        payload["student_context"] = student_context
    data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    req = urllib.request.Request(
        BASE,
        data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        body = json.loads(resp.read().decode("utf-8"))
    return str(body.get("answer", ""))


def main() -> None:
    for test_id, question, ctx in TESTS:
        print(f"\n=== {test_id} ===")
        print(f"Q: {question}")
        try:
            answer = post(question, ctx)
            print(f"A: {answer[:1500]}{'...' if len(answer) > 1500 else ''}")
        except Exception as exc:
            print(f"ERROR: {exc}")


if __name__ == "__main__":
    main()
