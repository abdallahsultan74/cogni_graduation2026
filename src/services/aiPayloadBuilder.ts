import type { Course, Enrollment as PrismaEnrollment } from "@prisma/client";

import type {
  CogniAdvisorCompletedCourse,
  CogniAdvisorDepartmentName,
  CogniAdvisorRecommendPayload,
  CogniAdvisorSemester,
  CogniAdvisorTerm,
  CogniAdvisorCourseType
} from "./cogniAdvisorAi.types.js";

import { getAiCourseCatalog, getUnionCourseCatalog } from "../utils/aiCourseCatalog.js";
import { mapSemesterToCogniAdvisorTerm } from "../utils/aiTermMapper.js";

type EnrollmentWithCourse = PrismaEnrollment & { course: Course };

const resolveDepartmentName = (majorType: string | null | undefined): CogniAdvisorDepartmentName => {
  const v = (majorType ?? "").trim().toUpperCase();
  if (v === "AI") return "AI";
  if (v === "CS") return "IT"; // backend uses "CS" in samples; map it to IT track for this program
  if (v === "IT") return "IT";
  // Default safe choice for the current catalog (IT+AI only)
  return "IT";
};

import { isValidUniversityStudentId } from "../utils/studentIdentity.js";

const formatStudentIdForAi = (universityStudentId: string | null | undefined, fallbackId: number): string => {
  const v = universityStudentId ?? String(fallbackId);
  if (!isValidUniversityStudentId(v)) {
    console.warn(`[CogniAdvisorAI] studentId "${v}" does not match pattern /^220\\d{4}$/`);
  }
  return v;
};

export const buildCogniAdvisorCompletedCourses = async (
  enrollments: EnrollmentWithCourse[],
  majorType?: string | null
): Promise<CogniAdvisorCompletedCourse[]> => {
  const catalog = await getAiCourseCatalog(majorType);
  const unionCatalog = await getUnionCourseCatalog();

  const completed: CogniAdvisorCompletedCourse[] = [];
  for (const e of enrollments) {
    const code = e.course.course_code;
    const meta = catalog.get(code) ?? unionCatalog.get(code);
    if (!meta) {
      throw new Error(`AI catalog missing metadata for course code "${code}"`);
    }

    const item: CogniAdvisorCompletedCourse = {
      code: meta.code,
      course_name: meta.course_name,
      credit_hours: meta.credit_hours,
      distribution_category: meta.distribution_category,
      type: meta.type as CogniAdvisorCourseType,
      prerequisites: meta.prerequisites,
      Term: meta.Term,
      department: meta.department,
    };

    if (meta.level !== undefined) {
      item.level = meta.level;
    }

    completed.push(item);
  }

  return completed;
};

export const buildCogniAdvisorRecommendPayload = async (params: {
  studentId: number;
  universityStudentId?: string | null;
  gpa: number;
  majorType: string | null;
  completedEnrollments: EnrollmentWithCourse[];
  semesterName?: string | null;
  term?: CogniAdvisorTerm;
  semester?: CogniAdvisorSemester;
  expectedToGraduate?: boolean;
}): Promise<CogniAdvisorRecommendPayload> => {
  const completedCourses = await buildCogniAdvisorCompletedCourses(
    params.completedEnrollments,
    params.majorType
  );
  const DepartmentName = resolveDepartmentName(params.majorType);
  const aiTermAndSemester =
    params.term && params.semester
      ? { Term: params.term, semester: params.semester }
      : mapSemesterToCogniAdvisorTerm(params.semesterName);

  const payload: CogniAdvisorRecommendPayload = {
    StudentId: formatStudentIdForAi(params.universityStudentId, params.studentId),
    GPA: params.gpa,
    semester: aiTermAndSemester.semester,
    Term: aiTermAndSemester.Term,
    DepartmentName,
    CompletedCourses: completedCourses
  };

  if (params.expectedToGraduate !== undefined) {
    payload.expected_to_graduate = params.expectedToGraduate;
  }

  return payload;
};

