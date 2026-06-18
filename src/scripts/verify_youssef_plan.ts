/**
 * Verify Y1 first-term study plan has all 6 bylaw courses.
 * Usage: npx tsx src/scripts/verify_youssef_plan.ts
 */
import { PrismaClient } from "@prisma/client";
import { generateStudyPlan } from "../generators/studyPlan.generator.js";

const EXPECTED = [
  "IT111",
  "MA111",
  "HU111",
  "HU113",
  "MA112",
  "IT110",
];

const EMAIL = "youssef.ibrahim.y1@student.eelu.edu.eg";
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findUnique({
    where: { personal_email: EMAIL },
    include: { student: true },
  });

  if (!user?.student) {
    console.error(`Student not found: ${EMAIL}`);
    process.exit(1);
  }

  const studentId = user.student.student_id;
  const enrollments = await prisma.enrollment.count({
    where: { student_id: studentId },
  });

  const result = await generateStudyPlan(studentId);
  const codes = result.courses.map((c) => c.course_code);

  console.log(`Student: ${EMAIL} (id=${studentId})`);
  console.log(`Enrollments: ${enrollments}`);
  console.log(`Courses (${codes.length}): ${codes.join(", ")}`);
  console.log(`Total credits: ${result.totalCredits}`);

  const missing = EXPECTED.filter((c) => !codes.includes(c));
  const extra = codes.filter((c) => !EXPECTED.includes(c));

  if (codes.length === 6 && missing.length === 0 && extra.length === 0) {
    console.log("✅ PASS — all 6 first-semester courses present");
    process.exit(0);
  }

  console.log("❌ FAIL");
  if (missing.length) console.log(`   Missing: ${missing.join(", ")}`);
  if (extra.length) console.log(`   Extra: ${extra.join(", ")}`);
  process.exit(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
