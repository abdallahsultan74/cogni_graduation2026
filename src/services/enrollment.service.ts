import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { recalculateStudentGPA, recalculateStudentEarnedHours } from "../utils/gpaCalculator.js";
import { computeSemesterGpa } from "../utils/gradeScale.js";
import { getCurrentSemesterIdFromSettings } from "../utils/planningSemester.js";
import { createNotification } from "./notification.service.js";

const VALID_GRADES = new Set([
  "A+", "A", "A-",
  "B+", "B", "B-",
  "C+", "C", "C-",
  "D+", "D", "D-",
  "F",
]);

const normalizeGrade = (grade: string): string => {
  const g = grade.trim().toUpperCase();
  if (!VALID_GRADES.has(g)) {
    throw new AppError(`Invalid grade: ${grade}`, 400);
  }
  return g;
};

export type SemesterResolutionInput = {
  semester_id?: number;
  semester_name?: string;
  result_date?: string;
};

export const resolveSemesterForGrades = async (
  input: SemesterResolutionInput,
  options?: { createIfMissing?: boolean }
): Promise<{ semester_id: number; semester_name: string | null; created: boolean }> => {
  if (input.semester_id) {
    const semester = await prisma.semester.findUnique({
      where: { semester_id: input.semester_id },
    });
    if (!semester) throw new AppError("Semester not found", 404);
    return {
      semester_id: semester.semester_id,
      semester_name: semester.semester_name,
      created: false,
    };
  }

  if (input.semester_name?.trim()) {
    const name = input.semester_name.trim();
    const existing = await prisma.semester.findFirst({
      where: { semester_name: { equals: name, mode: "insensitive" } },
    });
    if (existing) {
      return {
        semester_id: existing.semester_id,
        semester_name: existing.semester_name,
        created: false,
      };
    }
    if (options?.createIfMissing === false) {
      return { semester_id: 0, semester_name: name, created: true };
    }
    const created = await prisma.semester.create({
      data: { semester_name: name },
    });
    return {
      semester_id: created.semester_id,
      semester_name: created.semester_name,
      created: true,
    };
  }

  if (input.result_date?.trim()) {
    const date = new Date(input.result_date.trim());
    if (Number.isNaN(date.getTime())) {
      throw new AppError("Invalid result date", 400);
    }

    const inRange = await prisma.semester.findFirst({
      where: {
        start_date: { lte: date },
        end_date: { gte: date },
      },
      orderBy: { start_date: "desc" },
    });
    if (inRange) {
      return {
        semester_id: inRange.semester_id,
        semester_name: inRange.semester_name,
        created: false,
      };
    }

    const beforeStart = await prisma.semester.findFirst({
      where: { start_date: { lte: date } },
      orderBy: { start_date: "desc" },
    });
    if (beforeStart) {
      return {
        semester_id: beforeStart.semester_id,
        semester_name: beforeStart.semester_name,
        created: false,
      };
    }

    throw new AppError(
      "No semester matches this date. Type a semester name instead.",
      404
    );
  }

  throw new AppError("Provide semester_id, semester_name, or result_date", 400);
};

export const resolveOptionalSemesterForGrades = async (
  input: SemesterResolutionInput
): Promise<number | undefined> => {
  if (input.semester_id || input.semester_name?.trim() || input.result_date?.trim()) {
    const resolved = await resolveSemesterForGrades(input);
    return resolved.semester_id;
  }
  return (await getCurrentSemesterIdFromSettings()) ?? undefined;
};

const checkPrerequisites = async (studentId: number, courseId: number) => {
  const prerequisites = await prisma.coursePrerequisite.findMany({
    where: { course_id: courseId },
  });
  if (prerequisites.length === 0) return true;

  const passedCourses = await prisma.enrollment.findMany({
    where: {
      student_id: studentId,
      grade: { not: null },
      NOT: { grade: "F" },
    },
  });
  const passedCourseIds = passedCourses.map((e) => e.course_id);
  for (const prereq of prerequisites) {
    if (!passedCourseIds.includes(prereq.prereq_course_id)) {
      throw new AppError(
        `Prerequisites not completed. Required: ${prereq.prereq_course_id}`,
        400
      );
    }
  }
  return true;
};

export const enrollStudent = async (studentId: number, courseId: number) => {
  const course = await prisma.course.findUnique({ where: { course_id: courseId } });
  if (!course) throw new AppError("Course not found", 404);
  if (!course.is_available) throw new AppError("Course not available for enrollment", 400);

  await checkPrerequisites(studentId, courseId);

  const existing = await prisma.enrollment.findFirst({
    where: { student_id: studentId, course_id: courseId },
  });
  if (existing) throw new AppError("Already enrolled in this course", 400);

  const semesterId = await getCurrentSemesterIdFromSettings();

  return prisma.enrollment.create({
    data: {
      student_id: studentId,
      course_id: courseId,
      semester_id: semesterId,
    },
  });
};

export const markCoursePassed = async (
  studentId: number,
  courseId: number,
  grade: string,
  semesterId?: number
) => {
  const normalized = normalizeGrade(grade);
  const course = await prisma.course.findUnique({ where: { course_id: courseId } });
  if (!course) throw new AppError("Course not found", 404);

  const student = await prisma.student.findUnique({ where: { student_id: studentId } });
  if (!student) throw new AppError("Student not found", 404);

  const resolvedSemesterId =
    semesterId ?? (await getCurrentSemesterIdFromSettings()) ?? undefined;

  let enrollment = await prisma.enrollment.findFirst({
    where: { student_id: studentId, course_id: courseId },
    include: { course: true },
  });

  const status = normalized === "F" ? "FAILED" : "PASSED";

  if (!enrollment) {
    enrollment = await prisma.enrollment.create({
      data: {
        student_id: studentId,
        course_id: courseId,
        status,
        grade: normalized,
        semester_id: resolvedSemesterId ?? null,
      },
      include: { course: true },
    });
  } else {
    await prisma.enrollment.update({
      where: { enrollment_id: enrollment.enrollment_id },
      data: {
        status,
        grade: normalized,
        semester_id: enrollment.semester_id ?? resolvedSemesterId ?? null,
      },
    });
  }

  await recalculateStudentEarnedHours(studentId);
  await recalculateStudentGPA(studentId);

  if (resolvedSemesterId) {
    await syncSemesterRecordFromEnrollments(studentId, resolvedSemesterId);
  }

  return { message: `Course marked as ${status}` };
};

export const syncSemesterRecordFromEnrollments = async (
  studentId: number,
  semesterId: number
) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { student_id: studentId, semester_id: semesterId },
    include: { course: true },
  });
  if (enrollments.length === 0) return null;

  const semesterGpa = computeSemesterGpa(
    enrollments.map((e) => ({ credits: e.course.credits, grade: e.grade }))
  );
  const registeredHours = enrollments.reduce((s, e) => s + e.course.credits, 0);

  const existing = await prisma.semesterRecord.findFirst({
    where: { student_id: studentId, semester_id: semesterId },
  });

  if (existing) {
    return prisma.semesterRecord.update({
      where: { record_id: existing.record_id },
      data: { semester_gpa: semesterGpa, registered_hours: registeredHours },
    });
  }

  return prisma.semesterRecord.create({
    data: {
      student_id: studentId,
      semester_id: semesterId,
      semester_gpa: semesterGpa,
      registered_hours: registeredHours,
    },
  });
};

export type BulkGradeRow = {
  student_email: string;
  course_code: string;
  grade: string;
};

export const bulkUploadGrades = async (
  semesterInput: SemesterResolutionInput,
  rows: BulkGradeRow[]
) => {
  const { semester_id: semesterId, semester_name: resolvedName } =
    await resolveSemesterForGrades(semesterInput);
  const semester = await prisma.semester.findUnique({ where: { semester_id: semesterId } });
  if (!semester) throw new AppError("Semester not found", 404);
  if (rows.length === 0) throw new AppError("No grades provided", 400);

  const displayName = semester.semester_name ?? resolvedName ?? String(semesterId);

  const results: Array<{ row: BulkGradeRow; ok: boolean; error?: string }> = [];
  const notifiedStudents = new Set<number>();

  for (const row of rows) {
    try {
      const normalized = normalizeGrade(row.grade);
      const user = await prisma.user.findFirst({
        where: {
          university_email: { equals: row.student_email.trim(), mode: "insensitive" },
        },
        include: { student: true },
      });
      if (!user?.student) {
        throw new AppError(`Student not found: ${row.student_email}`, 404);
      }

      const course = await prisma.course.findFirst({
        where: { course_code: row.course_code.trim().toUpperCase() },
      });
      if (!course) {
        throw new AppError(`Course not found: ${row.course_code}`, 404);
      }

      await markCoursePassed(user.student.student_id, course.course_id, normalized, semesterId);
      results.push({ row, ok: true });

      if (!notifiedStudents.has(user.student.student_id)) {
        notifiedStudents.add(user.student.student_id);
        await createNotification({
          recipient_id: user.student.student_id,
          title: "تم رفع نتائج الفصل",
          body: `تم تحديث نتائجك لفصل ${displayName}.`,
          type: "GRADES",
          action_url: "/student/transcript",
          entity_id: semesterId,
        });
      }
    } catch (e) {
      results.push({
        row,
        ok: false,
        error: e instanceof AppError ? e.message : "Unknown error",
      });
    }
  }

  const success = results.filter((r) => r.ok).length;
  const failed = results.filter((r) => !r.ok).length;

  return {
    success,
    failed,
    results,
    semester_id: semesterId,
    semester_name: displayName,
  };
};
