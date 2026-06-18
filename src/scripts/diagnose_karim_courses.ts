import prisma from "../config/prisma.js";
import { resolvePlanningSemesterName } from "../utils/planningSemester.js";
import { getAvailableCoursesForStudent } from "../services/courseEligibility.service.js";

async function diagnoseKarim() {
  const user = await prisma.user.findUnique({
    where: { personal_email: "failed.y2@student.eelu.edu.eg" },
    include: { student: true },
  });

  if (!user?.student) {
    console.log("Karim not found");
    return;
  }

  const studentId = user.student.student_id;
  const planningName = await resolvePlanningSemesterName(studentId);
  const { courses, planningTerm, creditLimit } =
    await getAvailableCoursesForStudent(studentId);

  const eligible = courses.filter((c) => c.eligible);
  const failedStillAvailable = eligible.filter((c) =>
    ["ST222", "CS216"].includes(c.code)
  );

  console.log({
    studentId,
    email: user.personal_email,
    planningSemesterName: planningName,
    planningTerm,
    creditLimit,
    totalAvailableRows: courses.length,
    eligibleCount: eligible.length,
    eligibleCodes: eligible.map((c) => c.code),
    failedRetakeEligible: failedStillAvailable.map((c) => c.code),
  });
}

diagnoseKarim()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
