import prisma from "../config/prisma.js";
import { callCogniAdvisorRecommend } from "../services/cogniAdvisorAiClient.js";
import { buildCogniAdvisorRecommendPayload } from "../services/aiPayloadBuilder.js";

const MAX_CREDITS = 18;

export const generateStudyPlan = async (studentId: number) => {
  const aiEnabled = process.env.COGNI_ADVISOR_AI_ENABLED === "1";
  if (aiEnabled) {
    try {
      const student = await prisma.student.findUnique({
        where: { student_id: studentId },
        select: { student_id: true, cumulative_gpa: true, major_type: true }
      });

      if (!student) throw new Error("Student not found");

      const semester = await prisma.semester.findFirst({
        orderBy: { semester_id: "desc" },
        select: { semester_name: true }
      });

      const completedEnrollments = await prisma.enrollment.findMany({
        where: {
          student_id: studentId,
          grade: { not: null },
          NOT: { grade: "F" }
        },
        include: { course: true }
      });

      const payload = await buildCogniAdvisorRecommendPayload({
        studentId,
        gpa: Number(student.cumulative_gpa),
        majorType: student.major_type,
        completedEnrollments,
        semesterName: semester?.semester_name ?? null,
        expectedToGraduate: false
      });

      const aiResult = await callCogniAdvisorRecommend(payload);

      const coreCodes =
        aiResult.core_course_codes ??
        aiResult.core_courses?.map((c) => c.code) ??
        [];

      const generalOptions = aiResult.electives?.GeneralOptions ?? [];
      const appliedOptions = aiResult.electives?.AppliedOptions ?? [];

      const orderedCodes = [
        ...coreCodes,
        ...generalOptions.map((c) => c.code),
        ...appliedOptions.map((c) => c.code)
      ];

      const dedupedOrderedCodes: string[] = [];
      const seen = new Set<string>();
      for (const code of orderedCodes) {
        if (seen.has(code)) continue;
        seen.add(code);
        dedupedOrderedCodes.push(code);
      }

      const suggestedCoursesFromAi = await prisma.course.findMany({
        where: {
          course_code: { in: dedupedOrderedCodes }
        },
        include: { prerequisites: true }
      });

      const courseByCode = new Map(
        suggestedCoursesFromAi.map((c) => [c.course_code, c])
      );

      const suggestedCourses = dedupedOrderedCodes
        .map((code) => courseByCode.get(code))
        .filter(Boolean);

      const totalCredits = suggestedCourses.reduce(
        (sum, c) => sum + (c?.credits ?? 0),
        0
      );

      return { totalCredits, courses: suggestedCourses };
    } catch (e) {
      console.error("[CogniAdvisorAI] Failed to generate AI plan:", e);
      // fallback to local generator below
    }
  }

  // 1. Get courses the student passed
  const completed = await prisma.enrollment.findMany({
    where: {
      student_id: studentId,
      grade: { not: null },
      NOT: { grade: "F" },
    },
    select: { course_id: true },
  });

  const completedIds = completed.map((c: { course_id: number }) => c.course_id);

  // 2. Get all courses
  const allCourses = await prisma.course.findMany({
    include: { prerequisites: true },
  });

  let totalCredits = 0;
  const suggestedCourses: any[] = [];

  for (const course of allCourses) {
    // skip if student already completed
    if (completedIds.includes(course.course_id)) continue;

    // Check prerequisites
    const prereqIds = course.prerequisites.map((p: any) => p.prereq_course_id);

    const hasAllPrereq = prereqIds.every((id: number) =>
      completedIds.includes(id)
    );

    if (!hasAllPrereq) continue;

    // Check max credits
    if (totalCredits + course.credits > MAX_CREDITS) continue;

    suggestedCourses.push(course);
    totalCredits += course.credits;
  }

  return {
    totalCredits,
    courses: suggestedCourses,
  };
};
