import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { getAiCourseCatalog } from "../utils/aiCourseCatalog.js";
import { mapSemesterToCogniAdvisorTerm } from "../utils/aiTermMapper.js";
import { resolvePlanningSemesterName } from "../utils/planningSemester.js";

export type AvailableCourse = {
  courseId: number;
  code: string;
  name: string;
  credits: number;
  level: string;
  levelNumber: number | null;
  term: string[];
  type: string;
  category: string;
  prerequisites: string[];
  prerequisitesMet: boolean;
  missingPrerequisites: string[];
  eligible: boolean;
  inPlan: boolean;
  reason?: string;
};

const DEFAULT_MAX_CREDITS = 18;
const MIN_CREDITS = 9;

const levelToNumber = (level: string | undefined): number | null => {
  if (!level) return null;
  const digit = level.match(/(\d)/);
  if (digit) return Number(digit[1]);
  const map: Record<string, number> = {
    "First Level": 1,
    "Second Level": 2,
    "Third Level": 3,
    "Fourth Level": 4,
    "First Year": 1,
    "Second Year": 2,
    "Third Year": 3,
    "Fourth Year": 4,
  };
  return map[level] ?? null;
};

const resolveGpaCap = (gpa: number): number => {
  if (gpa < 1.0) return 12;
  if (gpa < 2.0) return 15;
  return DEFAULT_MAX_CREDITS;
};

const satisfiesPrereq = (
  prereq: string,
  completedCodes: Set<string>,
  completedHours: number
): boolean => {
  if (prereq.startsWith("Passing ")) {
    const match = prereq.match(/Passing (\d+)/);
    return match ? completedHours >= Number(match[1]) : false;
  }
  return completedCodes.has(prereq);
};

export const getCreditLimitForStudent = async (studentId: number): Promise<number> => {
  const [student, completedCount] = await Promise.all([
    prisma.student.findUnique({
      where: { student_id: studentId },
      select: { cumulative_gpa: true },
    }),
    prisma.enrollment.count({
      where: {
        student_id: studentId,
        grade: { not: null },
        NOT: { grade: "F" },
      },
    }),
  ]);

  if (completedCount === 0) return DEFAULT_MAX_CREDITS;
  return resolveGpaCap(Number(student?.cumulative_gpa ?? 0));
};

const resolveDepartment = (majorType: string | null | undefined): string => {
  const v = (majorType ?? "IT").trim().toUpperCase();
  return v === "AI" ? "AI" : "IT";
};

export const getAvailableCoursesForStudent = async (
  studentId: number,
  planId?: number
): Promise<{
  courses: AvailableCourse[];
  creditLimit: number;
  planningTerm: string;
  minCredits: number;
}> => {
  const [student, completedEnrollments, planningSemesterName, planDetails] =
    await Promise.all([
      prisma.student.findUnique({
        where: { student_id: studentId },
        select: { major_type: true },
      }),
      prisma.enrollment.findMany({
        where: {
          student_id: studentId,
          grade: { not: null },
          NOT: { grade: "F" },
        },
        include: { course: true },
      }),
      resolvePlanningSemesterName(studentId),
      planId
        ? prisma.planDetail.findMany({
            where: { plan_id: planId },
            select: { course_id: true },
          })
        : Promise.resolve([]),
    ]);

  const catalog = await getAiCourseCatalog(student?.major_type);

  const completedCodes = new Set(
    completedEnrollments.map((e) => e.course.course_code)
  );
  const completedHours = completedEnrollments.reduce(
    (sum, e) => sum + e.course.credits,
    0
  );
  const { Term: planningTerm } = mapSemesterToCogniAdvisorTerm(planningSemesterName);
  const department = resolveDepartment(student?.major_type);
  const inPlanIds = new Set(planDetails.map((p) => p.course_id));
  const creditLimit = await getCreditLimitForStudent(studentId);

  const dbCourses = await prisma.course.findMany({
    orderBy: { course_code: "asc" },
    include: {
      prerequisites: { include: { prereq: true } },
    },
  });

  const courses: AvailableCourse[] = [];

  for (const course of dbCourses) {
    const inPlan = inPlanIds.has(course.course_id);
    if (completedCodes.has(course.course_code) && !inPlan) continue;

    const meta = catalog.get(course.course_code);
    if (!meta && !inPlan) continue;
    const terms = meta?.Term?.map(String) ?? [];
    const termOk =
      terms.includes("All") || terms.includes(planningTerm);

    const prereqCodes =
      meta?.prerequisites ??
      course.prerequisites.map((p) => p.prereq.course_code);
    const missingPrereqs = prereqCodes.filter(
      (p) => !satisfiesPrereq(p, completedCodes, completedHours)
    );
    const prereqsMet = missingPrereqs.length === 0;

    let deptOk = true;
    if (meta) {
      const cat = meta.distribution_category;
      const courseDept = meta.department;
      if (
        ["Applied_Sciences", "Graduation_Project", "Specialized_Labs"].includes(
          cat
        ) &&
        courseDept !== "null" &&
        courseDept !== department
      ) {
        deptOk = false;
      }
    }

    const eligible = inPlan || (termOk && prereqsMet && deptOk);
    let reason: string | undefined;
    if (inPlan) reason = undefined;
    else if (!termOk) reason = `Not offered in ${planningTerm} term`;
    else if (!prereqsMet)
      reason = `Missing prerequisites: ${missingPrereqs.join(", ")}`;
    else if (!deptOk) reason = "Outside program track";

    courses.push({
      courseId: course.course_id,
      code: course.course_code,
      name: course.course_name,
      credits: course.credits,
      level: meta?.level ?? "—",
      levelNumber: levelToNumber(meta?.level),
      term: terms,
      type: meta?.type ?? "Mandatory",
      category: meta?.distribution_category ?? "",
      prerequisites: prereqCodes,
      prerequisitesMet: prereqsMet,
      missingPrerequisites: missingPrereqs,
      eligible,
      inPlan: inPlanIds.has(course.course_id),
      reason,
    });
  }

  return { courses, creditLimit, planningTerm, minCredits: MIN_CREDITS };
};

export const validateCourseSelection = async (
  studentId: number,
  courseIds: number[],
  planId?: number
): Promise<{ totalCredits: number; courseCount: number }> => {
  const { courses: available, creditLimit, minCredits } =
    await getAvailableCoursesForStudent(studentId, planId);
  const byId = new Map(available.map((c) => [c.courseId, c]));

  let totalCredits = 0;
  const seen = new Set<number>();

  for (const id of courseIds) {
    if (seen.has(id)) continue;
    seen.add(id);

    let row = byId.get(id);
    if (!row) {
      const course = await prisma.course.findUnique({
        where: { course_id: id },
        select: { course_id: true, course_code: true, course_name: true, credits: true },
      });
      if (!course) {
        throw new AppError(`Course not found`, 400);
      }
      row = {
        courseId: course.course_id,
        code: course.course_code,
        name: course.course_name,
        credits: course.credits,
        level: "—",
        levelNumber: null,
        term: [],
        type: "Mandatory",
        category: "",
        prerequisites: [],
        prerequisitesMet: true,
        missingPrerequisites: [],
        eligible: true,
        inPlan: true,
      };
    }
    if (!row.eligible) {
      throw new AppError(
        `${row.code}: ${row.reason ?? "Not eligible per bylaws"}`,
        400
      );
    }
    totalCredits += row.credits;
  }

  if (courseIds.length > 0 && totalCredits > creditLimit) {
    throw new AppError(
      `Total credits (${totalCredits}) exceeds the limit (${creditLimit})`,
      400
    );
  }

  if (courseIds.length > 0 && totalCredits < minCredits) {
    throw new AppError(
      `Minimum registration is ${minCredits} credits (selected: ${totalCredits})`,
      400
    );
  }

  return { totalCredits, courseCount: seen.size };
};
