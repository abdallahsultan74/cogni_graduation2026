import prisma from "../config/prisma.js";
import { callCogniAdvisorRecommend } from "../services/cogniAdvisorAiClient.js";
import { buildCogniAdvisorRecommendPayload } from "../services/aiPayloadBuilder.js";
import { resolvePlanningSemesterName } from "../utils/planningSemester.js";
import type {
  CogniAdvisorCourseSummary,
  CogniAdvisorRecommendResult
} from "../services/cogniAdvisorAi.types.js";

import { getYear1FirstSemesterCodes } from "../utils/aiCourseCatalog.js";

const DEFAULT_MAX_CREDITS = 18;
const GRADUATION_HOURS_THRESHOLD = 96;

const pickElectiveCodes = (
  selected: CogniAdvisorCourseSummary[] | undefined,
  options: CogniAdvisorCourseSummary[] | undefined,
  slotCount: number | undefined
): string[] => {
  if (selected?.length) {
    return selected.map((c) => c.code);
  }

  const count = slotCount ?? 0;
  if (!count || !options?.length) return [];

  const picked: string[] = [];
  for (const course of options) {
    if (picked.length >= count) break;
    picked.push(course.code);
  }
  return picked;
};

const resolveCreditLimit = (
  aiResult: CogniAdvisorRecommendResult,
  isFirstTermStudent: boolean
): number => {
  const summary = aiResult.student_summary;
  const raw =
    summary?.credit_limit ??
    summary?.CreditLimit ??
    DEFAULT_MAX_CREDITS;
  const limit = Number(raw);
  const resolved =
    Number.isFinite(limit) && limit > 0 ? limit : DEFAULT_MAX_CREDITS;

  // طالب أول ترم: الحد الأدنى 18 ساعة (فصل أول = 16 ساعة حسب اللائحة)
  if (isFirstTermStudent) {
    return Math.max(resolved, DEFAULT_MAX_CREDITS);
  }
  return resolved;
};

const isAiEnabled = () =>
  process.env.COGNI_ADVISOR_AI_ENABLED === "1" ||
  process.env.COGNI_ADVISOR_AI_ENABLED === "true";

export const generateStudyPlan = async (studentId: number) => {
  const aiEnabled = isAiEnabled();
  if (aiEnabled) {
    try {
      const student = await prisma.student.findUnique({
        where: { student_id: studentId },
        select: {
          student_id: true,
          university_student_id: true,
          cumulative_gpa: true,
          major_type: true,
          total_earned_hours: true
        }
      });

      if (!student) throw new Error("Student not found");

      const completedEnrollments = await prisma.enrollment.findMany({
        where: {
          student_id: studentId,
          grade: { not: null },
          NOT: { grade: "F" }
        },
        include: { course: true }
      });

      const isFirstTermStudent = completedEnrollments.length === 0;
      const planningSemesterName = await resolvePlanningSemesterName(studentId);

      const completedHours = completedEnrollments.reduce(
        (sum, e) => sum + e.course.credits,
        0
      );
      const expectedToGraduate =
        student.total_earned_hours >= GRADUATION_HOURS_THRESHOLD ||
        completedHours >= GRADUATION_HOURS_THRESHOLD;

      const payload = await buildCogniAdvisorRecommendPayload({
        studentId,
        universityStudentId: student.university_student_id,
        gpa: Number(student.cumulative_gpa),
        majorType: student.major_type,
        completedEnrollments,
        semesterName: planningSemesterName,
        term: isFirstTermStudent ? "First" : undefined,
        semester: isFirstTermStudent ? "regular" : undefined,
        expectedToGraduate
      });

      const aiResult = await callCogniAdvisorRecommend(payload);
      const maxCredits = resolveCreditLimit(aiResult, isFirstTermStudent);

      const completedCodes = new Set(
        completedEnrollments.map((e) => e.course.course_code)
      );

      let coreCodes =
        aiResult.core_course_codes ??
        aiResult.core_courses?.map((c) => c.code) ??
        [];

      if (isFirstTermStudent) {
        const year1Codes = await getYear1FirstSemesterCodes(student.major_type);
        coreCodes = year1Codes.filter((code) => !completedCodes.has(code));
      }

      const generalCodes = pickElectiveCodes(
        aiResult.electives?.GeneralSelected,
        aiResult.electives?.GeneralOptions,
        aiResult.electives?.General
      );
      const appliedCodes = pickElectiveCodes(
        aiResult.electives?.AppliedSelected,
        aiResult.electives?.AppliedOptions,
        aiResult.electives?.Applied
      );

      const orderedCodes = [
        ...coreCodes,
        ...generalCodes,
        ...appliedCodes,
      ].filter((code) => !completedCodes.has(code));

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

      const missingCodes = dedupedOrderedCodes.filter(
        (code) => !courseByCode.has(code)
      );
      if (missingCodes.length > 0) {
        console.warn(
          "[CogniAdvisorAI] AI course codes not found in DB:",
          missingCodes.join(", ")
        );
      }

      const suggestedCourses = dedupedOrderedCodes
        .map((code) => courseByCode.get(code))
        .filter(Boolean);

      const cappedCourses: typeof suggestedCourses = [];
      let runningCredits = 0;
      for (const c of suggestedCourses) {
        if (!c) continue;
        if (runningCredits + c.credits > maxCredits) continue;
        cappedCourses.push(c);
        runningCredits += c.credits;
      }

      const totalCredits = runningCredits;

      return { totalCredits, courses: cappedCourses };
    } catch (e) {
      console.error("[CogniAdvisorAI] Failed to generate AI plan:", e);
      // fallback to local generator below
    }
  }

  const completed = await prisma.enrollment.findMany({
    where: {
      student_id: studentId,
      grade: { not: null },
      NOT: { grade: "F" },
    },
    select: { course_id: true, course: { select: { course_code: true } } },
  });

  const completedIds = completed.map((c) => c.course_id);
  const completedCodes = new Set(
    completed.map((c) => c.course.course_code)
  );

  if (completed.length === 0) {
    const student = await prisma.student.findUnique({
      where: { student_id: studentId },
      select: { major_type: true },
    });
    const year1Codes = await getYear1FirstSemesterCodes(student?.major_type);
    const fallbackCourses = await prisma.course.findMany({
      where: { course_code: { in: year1Codes } },
      include: { prerequisites: true },
      orderBy: { course_code: "asc" },
    });
    const byCode = new Map(
      fallbackCourses.map((c) => [c.course_code, c])
    );
    const ordered = year1Codes.map((code) => byCode.get(code)).filter(
      Boolean
    );
    const totalCredits = ordered.reduce((sum, c) => sum + (c?.credits ?? 0), 0);
    return { totalCredits, courses: ordered };
  }

  const allCourses = await prisma.course.findMany({
    include: { prerequisites: true },
  });

  let totalCredits = 0;
  const suggestedCourses: typeof allCourses = [];

  for (const course of allCourses) {
    if (completedIds.includes(course.course_id)) continue;

    const prereqIds = course.prerequisites.map((p) => p.prereq_course_id);
    const hasAllPrereq = prereqIds.every((id) => completedIds.includes(id));
    if (!hasAllPrereq) continue;

    if (totalCredits + course.credits > DEFAULT_MAX_CREDITS) continue;

    suggestedCourses.push(course);
    totalCredits += course.credits;
  }

  return {
    totalCredits,
    courses: suggestedCourses,
  };
};
