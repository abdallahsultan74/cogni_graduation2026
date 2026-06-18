import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  ensureSemesters,
  SEMESTER_KEY_TO_ID,
  type SemesterKey,
} from "./seed_semesters.js";

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(
  __dirname,
  "../../cogni-advisor-ai/GP/recommendation/data"
);

type Track = "IT" | "AI";

type CatalogRow = {
  code: string;
  Term: string[];
  level: string;
};

const LEVEL_TERM_TO_SEMESTER: Record<string, SemesterKey> = {
  "First Year|First": "fall2023",
  "First Year|Second": "spring2024",
  "Second Year|First": "fall2024",
  "Second Year|Second": "spring2025",
  "Third Year|First": "fall2025",
  "Third Year|Second": "spring2026",
  "Fourth Year|First": "fall2026",
  "Fourth Year|Second": "fall2026",
};

function buildTrackMap(track: Track): Map<string, SemesterKey> {
  const file = path.join(DATA_DIR, `courses_${track.toLowerCase()}.json`);
  const rows = JSON.parse(fs.readFileSync(file, "utf-8")) as CatalogRow[];
  const map = new Map<string, SemesterKey>();
  for (const row of rows) {
    const term = row.Term?.[0];
    if (!term || term === "Summer") continue;
    const key = `${row.level}|${term}`;
    const semester = LEVEL_TERM_TO_SEMESTER[key];
    if (semester) map.set(row.code, semester);
  }
  return map;
}

const IT_SEMESTER_MAP = buildTrackMap("IT");
const AI_SEMESTER_MAP = buildTrackMap("AI");

export function semesterIdForCourse(
  courseCode: string,
  majorType?: string | null
): number | null {
  const track: Track =
    (majorType ?? "IT").trim().toUpperCase() === "AI" ? "AI" : "IT";
  const map = track === "AI" ? AI_SEMESTER_MAP : IT_SEMESTER_MAP;
  const key = map.get(courseCode);
  return key ? SEMESTER_KEY_TO_ID[key] : null;
}

async function fixEnrollments() {
  await ensureSemesters();

  const enrollments = await prisma.enrollment.findMany({
    include: {
      course: true,
      student: { select: { major_type: true } },
    },
  });

  let updated = 0;
  let unassigned = 0;

  for (const e of enrollments) {
    const semesterId = semesterIdForCourse(
      e.course.course_code,
      e.student.major_type
    );
    if (!semesterId) {
      unassigned++;
      continue;
    }
    if (e.semester_id !== semesterId) {
      await prisma.enrollment.update({
        where: { enrollment_id: e.enrollment_id },
        data: { semester_id: semesterId },
      });
      updated++;
    }
  }

  console.log(`✅ Updated ${updated} enrollments, ${unassigned} without mapping`);
}

const isDirectRun =
  process.argv[1]?.replace(/\\/g, "/").endsWith("fix_enrollment_semesters.ts") ||
  process.argv[1]?.replace(/\\/g, "/").includes("fix_enrollment_semesters");

if (isDirectRun) {
  fixEnrollments()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}

export { fixEnrollments, IT_SEMESTER_MAP, AI_SEMESTER_MAP };
