import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureSemesters } from "./seed_semesters.js";
import { semesterIdForCourse } from "./fix_enrollment_semesters.js";

const prisma = new PrismaClient();

const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0,
  A: 3.7,
  "B+": 3.3,
  B: 3.0,
  "C+": 2.7,
  C: 2.4,
  "D+": 2.2,
  D: 2.0,
  F: 0.0,
};

type EnrollmentSeed = {
  course_code: string;
  grade: string;
  status?: string;
  /** Override catalog semester (e.g. Spring 2025 = 4) */
  semester_id?: number;
};

const withGrades = (codes: string[], grades: string[]): EnrollmentSeed[] =>
  codes.map((course_code, i) => ({
    course_code,
    grade: grades[i] ?? "B",
    status: grades[i] === "F" ? "FAILED" : "PASSED",
  }));

/** 4 طلاب للتجربة: راسب / إعادة / ضعيف */
const atRiskStudents: Array<{
  first_name: string;
  last_name: string;
  national_id: string;
  personal_email: string;
  gender: string;
  street_address: string;
  phone: string;
  major_type: "IT" | "AI";
  level: number;
  enrollments: EnrollmentSeed[];
}> = [
  {
    first_name: "حسام",
    last_name: "رامي",
    national_id: "29817151700017",
    personal_email: "hossam.ramy.y2@student.eelu.edu.eg",
    gender: "male",
    street_address: "12 شارع الجامعة، طنطا",
    phone: "01011110017",
    major_type: "IT",
    level: 2,
    enrollments: [
      ...withGrades(
        ["IT111", "MA111", "HU111", "HU413", "MA112", "IT110"],
        ["C", "D", "C+", "D+", "C", "D"]
      ),
      ...withGrades(
        ["ST121", "HU112", "MA113", "HU101", "IT113", "CS112"],
        ["D", "C", "D+", "C", "D", "C"]
      ),
      ...withGrades(
        ["CS215", "DS211", "MA214", "IT231", "ST222", "CS240"],
        ["D", "F", "D+", "C", "F", "D"]
      ),
    ],
  },
  {
    first_name: "كريم",
    last_name: "عادل",
    national_id: "29818151800018",
    personal_email: "failed.y2@student.eelu.edu.eg",
    gender: "male",
    street_address: "5 شارع النيل، دمياط",
    phone: "01011110018",
    major_type: "IT",
    level: 2,
    enrollments: [
      ...withGrades(
        ["IT111", "MA111", "HU111", "HU413", "MA112", "IT110"],
        ["B", "C", "B", "C+", "B", "C"]
      ),
      ...withGrades(
        ["ST121", "HU112", "MA113", "HU101", "IT113", "CS112"],
        ["C+", "B", "C", "B", "C+", "B"]
      ),
      ...withGrades(
        ["CS215", "DS211", "MA214", "IT231", "ST222", "CS240"],
        ["C", "D", "C+", "B", "F", "C"]
      ),
      ...withGrades(
        ["IT217", "CS216", "HU427", "IT230", "LB211"],
        ["C+", "F", "B", "B+", "B"]
      ),
      // AI321 requires ST222 — Karim failed ST222 in Fall 2024, so take IT333 instead (IT231 only)
      {
        course_code: "IT333",
        grade: "B",
        status: "PASSED",
        semester_id: 4,
      },
    ],
  },
  {
    first_name: "سارة",
    last_name: "إعادة",
    national_id: "29719151900019",
    personal_email: "repeat.y3@student.eelu.edu.eg",
    gender: "female",
    street_address: "3 شارع الجامعة، الإسكندرية",
    phone: "01011110019",
    major_type: "AI",
    level: 3,
    enrollments: [
      ...withGrades(
        ["IT111", "MA111", "HU111", "HU113", "MA112", "IT110"],
        ["B+", "B", "B", "A", "B+", "B"]
      ),
      ...withGrades(
        ["ST121", "HU112", "MA113", "HU101", "IT113", "IT114"],
        ["B", "B+", "B", "A", "B", "B+"]
      ),
      ...withGrades(
        ["IT215", "DS211", "MA214", "IT231", "ST222", "CS240"],
        ["B", "B+", "B", "A", "B", "B+"]
      ),
      ...withGrades(
        ["IT217", "IT216", "AI321", "HU427", "IT230", "LB211"],
        ["B+", "B", "B", "A", "B+", "B"]
      ),
      { course_code: "CS319", grade: "F", status: "FAILED" },
    ],
  },
  {
    first_name: "أحمد",
    last_name: "خطر",
    national_id: "29920152000020",
    personal_email: "atrisk.y1@student.eelu.edu.eg",
    gender: "male",
    street_address: "7 شارع النيل، بنها",
    phone: "01011110020",
    major_type: "IT",
    level: 1,
    enrollments: withGrades(
      ["IT111", "MA111", "HU111", "HU413", "MA112", "IT110"],
      ["D", "F", "D+", "C", "D", "F"]
    ),
  },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const catalogPath = path.resolve(
  __dirname,
  "../../cogni-advisor-ai/GP/recommendation/data/courses.json"
);
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8")) as Array<{
  code: string;
  credit_hours: number;
}>;
const creditByCode = new Map(catalog.map((c) => [c.code, c.credit_hours]));

const computeStats = (enrollments: EnrollmentSeed[]) => {
  let totalHours = 0;
  let weighted = 0;
  let gradedHours = 0;
  for (const e of enrollments) {
    const hours = creditByCode.get(e.course_code) ?? 3;
    if (e.grade !== "F") totalHours += hours;
    const points = GRADE_POINTS[e.grade] ?? 0;
    if (e.grade !== "F") {
      weighted += points * hours;
      gradedHours += hours;
    }
  }
  const gpa = gradedHours > 0 ? Number((weighted / gradedHours).toFixed(2)) : 0;
  return { totalHours, gpa };
};

async function run() {
  console.log("Seeding at-risk students...");
  await ensureSemesters();
  const passwordHash = await bcrypt.hash("Password123", 10);

  const advisor = await prisma.user.findFirst({
    where: { role: UserRole.ADVISOR },
    include: { advisor: true },
  });
  const advisorId = advisor?.advisor?.advisor_id ?? null;

  for (const s of atRiskStudents) {
    const existing = await prisma.user.findUnique({
      where: { personal_email: s.personal_email },
      include: { student: true },
    });

    const { totalHours, gpa } = computeStats(s.enrollments);

    let studentId: number;

    if (existing?.student) {
      studentId = existing.student.student_id;
      await prisma.student.update({
        where: { student_id: studentId },
        data: {
          level: s.level,
          cumulative_gpa: gpa,
          total_earned_hours: totalHours,
          major_type: s.major_type,
        },
      });
      await prisma.enrollment.deleteMany({ where: { student_id: studentId } });
      console.log(`Updated existing ${s.personal_email}`);
    } else {
      const user = await prisma.user.create({
        data: {
          first_name: s.first_name,
          last_name: s.last_name,
          national_id: s.national_id,
          personal_email: s.personal_email,
          password_hash: passwordHash,
          gender: s.gender,
          street_address: s.street_address,
          role: "STUDENT",
          phones: { create: [{ phone_number: s.phone }] },
          student: {
            create: {
              major_type: s.major_type,
              level: s.level,
              cumulative_gpa: gpa,
              total_earned_hours: totalHours,
              advisor_id: advisorId,
            },
          },
        },
        include: { student: true },
      });
      if (!user.student) continue;
      studentId = user.student.student_id;
      console.log(`Created ${s.personal_email}`);
    }

    for (const e of s.enrollments) {
      const course = await prisma.course.findUnique({
        where: { course_code: e.course_code },
      });
      if (!course) continue;
      await prisma.enrollment.create({
        data: {
          student_id: studentId,
          course_id: course.course_id,
          semester_id:
            e.semester_id ?? semesterIdForCourse(e.course_code, s.major_type),
          status: e.status ?? (e.grade === "F" ? "FAILED" : "PASSED"),
          grade: e.grade,
        },
      });
    }
    console.log(`  L${s.level} GPA ${gpa}, ${totalHours}h, ${s.enrollments.length} courses`);
  }
  console.log("Done.");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
