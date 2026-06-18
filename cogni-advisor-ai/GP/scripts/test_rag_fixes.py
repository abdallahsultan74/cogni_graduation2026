#!/usr/bin/env python3
"""Quick verification for chatbot RAG fixes."""
from __future__ import annotations

import json
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

from chatBot.structured_lookup import try_plan_answer, try_structured_answer
from chatBot.utils import process_query

QUESTIONS = [
    "إيه الحد الأقصى للساعات في الفصل الصيفي؟",
    "إيه مواد السنة التانية ترم أول؟",
    "إيه نسبة الحضور المطلوبة؟",
]

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


def main() -> None:
    print("=== Structured lookup ===")
    for q in QUESTIONS:
        ans = try_structured_answer(q)
        print(f"\nQ: {q}")
        print(f"A: {ans}")

    print("\n=== Plan with student context ===")
    plan_q = "أريد خطة دراسية للفصل القادم"
    plan = try_plan_answer(plan_q, SAMPLE_CONTEXT) or process_query(plan_q, SAMPLE_CONTEXT)
    print(f"\nQ: {plan_q}")
    print(f"A: {plan[:1200]}{'...' if len(plan) > 1200 else ''}")


if __name__ == "__main__":
    main()
