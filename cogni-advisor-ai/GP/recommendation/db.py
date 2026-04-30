"""SQLite layer for the EELU advisor.

We treat ``students.seed.json`` as the source of truth and rebuild
``students.db`` from it on first request. The DB itself is gitignored —
only the seed JSON is reviewable.

Schema is tiny on purpose:
- ``students`` carries display-only metadata.
- ``enrollments`` records each course attempt with grade + term + year.
- We DO NOT store derived fields (gpa, total_credits, level). Those are
  computed on read from the catalog + bylaw, so they cannot drift.
"""
from __future__ import annotations

import json
import logging
import sqlite3
from pathlib import Path
from typing import Any, Iterable

logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
DB_PATH = DATA_DIR / "students.db"
SEED_PATH = DATA_DIR / "students.seed.json"

SCHEMA = """
CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    department TEXT NOT NULL CHECK (department IN ('IT', 'AI', 'null')),
    enrolled_year INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL REFERENCES students(student_id) ON DELETE CASCADE,
    course_code TEXT NOT NULL,
    grade TEXT NOT NULL,
    term_taken TEXT NOT NULL CHECK (term_taken IN ('First', 'Second', 'Summer')),
    year_taken INTEGER NOT NULL,
    is_retake INTEGER NOT NULL DEFAULT 0,
    UNIQUE (student_id, course_code, year_taken, term_taken)
);

CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
"""


def connect() -> sqlite3.Connection:
    """Open a connection with row_factory set to sqlite3.Row."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def init_schema(conn: sqlite3.Connection | None = None) -> None:
    own = conn is None
    conn = conn or connect()
    try:
        conn.executescript(SCHEMA)
        conn.commit()
    finally:
        if own:
            conn.close()


def seed_from_json(seed_path: Path = SEED_PATH, *, replace: bool = True) -> int:
    """Load the seed JSON into the DB. Returns the number of students seeded.

    With ``replace=True`` (default) the tables are wiped first so reseeding
    is deterministic. Use ``replace=False`` to append (rare).
    """
    if not seed_path.exists():
        raise FileNotFoundError(f"Seed file not found: {seed_path}")

    with seed_path.open(encoding="utf-8") as handle:
        payload = json.load(handle)

    students = payload.get("students") or []
    conn = connect()
    try:
        init_schema(conn)
        if replace:
            conn.execute("DELETE FROM enrollments")
            conn.execute("DELETE FROM students")
        for student in students:
            conn.execute(
                "INSERT OR REPLACE INTO students (student_id, name, department, enrolled_year) VALUES (?, ?, ?, ?)",
                (
                    student["student_id"],
                    student["name"],
                    student.get("department", "IT"),
                    int(student.get("enrolled_year", 2021)),
                ),
            )
            for enrollment in student.get("enrollments", []):
                conn.execute(
                    """INSERT OR REPLACE INTO enrollments
                       (student_id, course_code, grade, term_taken, year_taken, is_retake)
                       VALUES (?, ?, ?, ?, ?, ?)""",
                    (
                        student["student_id"],
                        enrollment["course_code"],
                        enrollment["grade"],
                        enrollment["term_taken"],
                        int(enrollment["year_taken"]),
                        int(enrollment.get("is_retake", 0)),
                    ),
                )
        conn.commit()
        logger.info("Seeded %d students from %s", len(students), seed_path)
        return len(students)
    finally:
        conn.close()


def ensure_seeded() -> None:
    """Idempotent — initialize the DB and seed it if it has no students yet."""
    init_schema()
    conn = connect()
    try:
        count = conn.execute("SELECT COUNT(*) AS n FROM students").fetchone()["n"]
        if count == 0:
            conn.close()
            seed_from_json()
    finally:
        try:
            conn.close()
        except sqlite3.ProgrammingError:
            pass


def all_students() -> list[dict[str, Any]]:
    conn = connect()
    try:
        return [dict(row) for row in conn.execute("SELECT * FROM students ORDER BY student_id").fetchall()]
    finally:
        conn.close()


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["init", "reseed", "dump"])
    parser.add_argument("student_id", nargs="?")
    args = parser.parse_args()

    logging.basicConfig(level=logging.INFO, format="%(message)s")

    if args.command == "init":
        init_schema()
        print(f"Schema ensured at {DB_PATH}")
    elif args.command == "reseed":
        n = seed_from_json(replace=True)
        print(f"Reseeded {n} students into {DB_PATH}")
    elif args.command == "dump":
        if not args.student_id:
            parser.error("dump requires a student_id argument")
        ensure_seeded()
        conn = connect()
        try:
            student = conn.execute("SELECT * FROM students WHERE student_id = ?", (args.student_id,)).fetchone()
            if not student:
                print(f"No student with id {args.student_id}")
                raise SystemExit(1)
            enrollments = conn.execute(
                "SELECT * FROM enrollments WHERE student_id = ? ORDER BY year_taken, term_taken, course_code",
                (args.student_id,),
            ).fetchall()
            print(json.dumps({
                "student": dict(student),
                "enrollments": [dict(e) for e in enrollments],
            }, indent=2))
        finally:
            conn.close()
