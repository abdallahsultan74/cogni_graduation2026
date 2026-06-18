import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { computeSemesterGpa } from "../utils/gradeScale.js";


export const getStudentById = async (id: number) => {
  const student = await prisma.student.findUnique({
    where: { student_id: id },
    include: {
      user: true
    }
  });

  if (!student)
    throw new AppError("Student not found", 404);

  return student;
};

const UPDATE_STUDENT_FIELDS = [
  "advisor_id",
  "major_type",
  "level",
  "cumulative_gpa",
  "total_earned_hours",
  "status"
] as const;

export const updateStudent = async (
  id: number,
  data: {
    advisor_id?: number | null;
    major_type?: string | null;
    level?: number;
    cumulative_gpa?: number;
    total_earned_hours?: number;
    status?: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  }
) => {
  const student = await prisma.student.findUnique({
    where: { student_id: id }
  });

  if (!student)
    throw new AppError("Student not found", 404);

  if (data.advisor_id != null) {
    const advisor = await prisma.advisor.findUnique({
      where: { advisor_id: data.advisor_id }
    });
    if (!advisor)
      throw new AppError("Advisor not found", 404);
  }

  const safeData: Record<string, unknown> = {};
  for (const key of UPDATE_STUDENT_FIELDS) {
    if (data[key] !== undefined) {
      if (key === "cumulative_gpa" && typeof data[key] === "number") {
        safeData[key] = data[key];
      } else {
        safeData[key] = data[key];
      }
    }
  }

  return prisma.student.update({
    where: { student_id: id },
    data: safeData
  });
};

export const deactivateStudent = async (id: number) => {
  const student = await prisma.student.findUnique({
    where: { student_id: id }
  });

  if (!student)
    throw new AppError("Student not found", 404);

  return prisma.student.update({
    where: { student_id: id },
    data: {
      status: "INACTIVE"
    }
  });
};

export const activateStudent = async (id: number) => {
  const student = await prisma.student.findUnique({
    where: { student_id: id }
  });

  if (!student)
    throw new AppError("Student not found", 404);

  return prisma.student.update({
    where: { student_id: id },
    data: {
      status: "ACTIVE"
    }
  });
};


export const getAcademicSummary = async (studentId: number) => {

  const student = await prisma.student.findUnique({
    where: { student_id: studentId }
  });

  if (!student)
    throw new AppError("Student not found", 404);

  const passedCourses = await prisma.enrollment.count({
    where: {
      student_id: studentId,
      status: "PASSED"
    }
  });

  const currentEnrollments = await prisma.enrollment.count({
    where: {
      student_id: studentId,
      status: "ENROLLED"
    }
  });

  const TOTAL_PROGRAM_HOURS = 144;

  return {
    student_id: student.student_id,
    university_student_id: student.university_student_id,
    cumulative_gpa: Number(student.cumulative_gpa),
    earned_hours: student.total_earned_hours,
    remaining_hours:
      TOTAL_PROGRAM_HOURS - student.total_earned_hours,
    current_level: student.level,
    passed_courses: passedCourses,
    current_enrollments: currentEnrollments
  };
};

export const getMyProfile = async (studentId: number) => {
  const student = await prisma.student.findUnique({
    where: { student_id: studentId },
    include: {
      user: {
        include: {
          phones: true
        }
      },
      advisor: {
        include: {
          user: true
        }
      }
    }
  });

  if (!student)
    throw new AppError("Student not found", 404);

  const { user, advisor, ...studentData } = student;
  const { password_hash: _, ...userSafe } = user;
  
  let advisorSafe = null;
  if (advisor && advisor.user) {
    const { password_hash: __, ...advUser } = advisor.user;
    advisorSafe = advUser;
  }

  return {
    ...studentData,
    cumulative_gpa: Number(student.cumulative_gpa),
    user: {
      ...userSafe,
      phones: user.phones.map((p) => p.phone_number)
    },
    advisor: advisorSafe
  };
};

export const updateMyProfile = async (
  studentId: number,
  data: {
    first_name?: string;
    last_name?: string;
    street_address?: string | null;
    phones?: string[];
  }
) => {
  const student = await prisma.student.findUnique({
    where: { student_id: studentId },
    include: { user: true }
  });

  if (!student)
    throw new AppError("Student not found", 404);

  const userId = student.student_id;

  const { phones, ...userFields } = data;
  const updatePayload: Record<string, unknown> = {};
  if (userFields.first_name !== undefined) updatePayload.first_name = userFields.first_name;
  if (userFields.last_name !== undefined) updatePayload.last_name = userFields.last_name;
  if (userFields.street_address !== undefined) updatePayload.street_address = userFields.street_address;

  if (Object.keys(updatePayload).length > 0) {
    await prisma.user.update({
      where: { user_id: userId },
      data: updatePayload
    });
  }

  if (phones !== undefined) {
    await prisma.userPhone.deleteMany({
      where: { user_id: userId }
    });
    if (phones.length > 0) {
      await prisma.userPhone.createMany({
        data: phones.map((phone_number) => ({ user_id: userId, phone_number }))
      });
    }
  }

  return getMyProfile(studentId);
};

export const getMyTranscript = async (studentId: number) => {
  const student = await prisma.student.findUnique({
    where: { student_id: studentId },
    select: {
      student_id: true,
      cumulative_gpa: true,
      total_earned_hours: true,
      level: true,
    },
  });

  if (!student) throw new AppError("Student not found", 404);

  const enrollments = await prisma.enrollment.findMany({
    where: { student_id: studentId },
    include: {
      course: true,
      semester: true,
    },
    orderBy: { enrollment_id: "asc" },
  });

  const semesterMap = new Map<
    number | "unassigned",
    {
      semester_id: number | null;
      semester_name: string;
      start_date: Date | null;
      courses: Array<{
        enrollment_id: number;
        course_code: string;
        course_name: string;
        credits: number;
        grade: string | null;
        status: string;
      }>;
    }
  >();

  for (const e of enrollments) {
    const key = e.semester_id ?? "unassigned";
    if (!semesterMap.has(key)) {
      semesterMap.set(key, {
        semester_id: e.semester_id,
        semester_name:
          e.semester?.semester_name ?? "Unassigned / prior record",
        start_date: e.semester?.start_date ?? null,
        courses: [],
      });
    }
    semesterMap.get(key)!.courses.push({
      enrollment_id: e.enrollment_id,
      course_code: e.course.course_code,
      course_name: e.course.course_name,
      credits: e.course.credits,
      grade: e.grade,
      status: e.status,
    });
  }

  const semesters = Array.from(semesterMap.values())
    .map((sem) => {
      const earned_hours = sem.courses
        .filter((c) => c.grade && c.grade !== "F")
        .reduce((sum, c) => sum + c.credits, 0);
      const registered_hours = sem.courses.reduce(
        (sum, c) => sum + c.credits,
        0
      );
      const semester_gpa = computeSemesterGpa(
        sem.courses.map((c) => ({ credits: c.credits, grade: c.grade }))
      );
      return {
        ...sem,
        semester_gpa,
        registered_hours,
        earned_hours,
      };
    })
    .sort((a, b) => {
      if (!a.start_date && !b.start_date) return 0;
      if (!a.start_date) return 1;
      if (!b.start_date) return -1;
      return a.start_date.getTime() - b.start_date.getTime();
    });

  // إدراج الفصول الصيفية الفارغة بين أول وآخر فصل مسجّل
  let withSummerGaps = semesters;
  if (semesters.length > 0) {
    const first = semesters[0].start_date!;
    const last = semesters[semesters.length - 1].start_date!;
    const enrolledIds = new Set(
      semesters.map((s) => s.semester_id).filter((id): id is number => id != null)
    );
    const allSemesters = await prisma.semester.findMany({
      where: {
        start_date: { gte: first, lte: last },
        semester_name: { contains: "Summer", mode: "insensitive" },
      },
      orderBy: { start_date: "asc" },
    });
    const summerGaps = allSemesters
      .filter((s) => !enrolledIds.has(s.semester_id))
      .map((s) => ({
        semester_id: s.semester_id,
        semester_name: s.semester_name,
        start_date: s.start_date,
        semester_gpa: 0,
        registered_hours: 0,
        earned_hours: 0,
        courses: [] as typeof semesters[0]["courses"],
      }));
    withSummerGaps = [...semesters, ...summerGaps].sort((a, b) => {
      if (!a.start_date || !b.start_date) return 0;
      return a.start_date.getTime() - b.start_date.getTime();
    });
  }

  return {
    student_id: student.student_id,
    cumulative_gpa: Number(student.cumulative_gpa),
    total_earned_hours: student.total_earned_hours,
    level: student.level,
    semesters: withSummerGaps,
  };
};

export const getStudentTranscript = async (studentId: number) => {
  return getMyTranscript(studentId);
};