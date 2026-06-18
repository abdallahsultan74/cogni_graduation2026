import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { StudentStatus } from "@prisma/client";

export const getMyProfile = async (advisorId: number) => {
  const advisor = await prisma.advisor.findUnique({
    where: { advisor_id: advisorId },
    include: {
      user: {
        select: {
          first_name: true,
          middle_name: true,
          last_name: true,
          university_email: true,
          personal_email: true,
          gender: true,
          street_address: true,
          phones: true
        }
      }
    }
  });

  if (!advisor) throw new AppError("Advisor not found", 404);

  const { user, ...advisorData } = advisor;
  const fullName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ");
  return {
    advisor_id: advisorData.advisor_id,
    advisor_code: `ADV-${String(advisorData.advisor_id).padStart(4, "0")}`,
    office_hours: advisorData.office_hours ?? null,
    bio: advisorData.bio ?? null,
    user: {
      full_name: fullName,
      first_name: user.first_name,
      last_name: user.last_name,
      university_email: user.university_email,
      personal_email: user.personal_email,
      gender: user.gender ?? null,
      street_address: user.street_address ?? null,
      phones: user.phones.map((p) => p.phone_number)
    }
  };
};

export const updateMyProfile = async (
  advisorId: number,
  data: {
    first_name?: string;
    last_name?: string;
    office_hours?: string | null;
    bio?: string | null;
  }
) => {
  const advisor = await prisma.advisor.findUnique({
    where: { advisor_id: advisorId },
    include: { user: true }
  });

  if (!advisor) throw new AppError("Advisor not found", 404);

  const { first_name, last_name, office_hours, bio } = data;

  if (first_name !== undefined || last_name !== undefined) {
    await prisma.user.update({
      where: { user_id: advisorId },
      data: {
        ...(first_name !== undefined && { first_name }),
        ...(last_name !== undefined && { last_name })
      }
    });
  }

  await prisma.advisor.update({
    where: { advisor_id: advisorId },
    data: {
      ...(office_hours !== undefined && { office_hours }),
      ...(bio !== undefined && { bio })
    }
  });

  return getMyProfile(advisorId);
};

export const getMyStudents = async (
  advisorId: number,
  filters?: { search?: string; level?: number }
) => {
  const where: any = { advisor_id: advisorId };
  if (filters?.level != null) where.level = filters.level;
  if (filters?.search?.trim()) {
    const term = filters.search.trim();
    if (/^220\d{4}$/.test(term)) {
      where.university_student_id = term;
    } else {
      const num = Number(term);
      if (!Number.isNaN(num) && Number.isInteger(num)) {
        where.student_id = num;
      } else {
        where.user = {
          OR: [
            { first_name: { contains: term, mode: "insensitive" } },
            { last_name: { contains: term, mode: "insensitive" } },
            { university_email: { contains: term, mode: "insensitive" } }
          ]
        };
      }
    }
  }

  const students = await prisma.student.findMany({
    where,
    include: {
      user: { select: { first_name: true, last_name: true, national_id: true } }
    },
    orderBy: [{ user: { last_name: "asc" } }, { user: { first_name: "asc" } }]
  });

  return students.map((s) => {
    const gpa = Number(s.cumulative_gpa);
    let academicStatus: "Active" | "Probation" | "At Risk" = "Active";
    if (s.status !== "ACTIVE") academicStatus = "At Risk";
    else if (gpa < 2) academicStatus = "Probation";
    else if (gpa < 2.5) academicStatus = "At Risk";

    return {
      student_id: s.student_id,
      student_code: s.university_student_id ?? `S${String(s.student_id).padStart(7, "0")}`,
      university_student_id: s.university_student_id,
      full_name: `${s.user.first_name} ${s.user.last_name}`,
      national_id: s.user.national_id,
      major_type: s.major_type,
      level: s.level,
      cumulative_gpa: gpa,
      total_earned_hours: s.total_earned_hours,
      status: s.status,
      academicStatus
    };
  });
};

export const getMyStudentById = async (advisorId: number, studentId: number) => {
  const student = await prisma.student.findFirst({
    where: { student_id: studentId, advisor_id: advisorId },
    include: {
      user: { include: { phones: true } }
    }
  });

  if (!student) throw new AppError("Student not found or not assigned to you", 404);

  const { user, ...rest } = student;
  const { password_hash: _, ...userSafe } = user;
  return {
    ...rest,
    user: {
      ...userSafe,
      phones: user.phones.map((p) => p.phone_number)
    }
  };
};

const AT_RISK_GPA_THRESHOLD = 2;
const AT_RISK_STATUS: StudentStatus[] = ["INACTIVE", "SUSPENDED"];

export const getDashboard = async (advisorId: number) => {
  const [pendingRequestsCount, totalStudentsCount, atRiskStudentsCount, recentPlans] =
    await Promise.all([
      prisma.studyPlan.count({
        where: {
          plan_status: "PENDING",
          submitted_at: { not: null },
          student: { advisor_id: advisorId }
        }
      }),
      prisma.student.count({
        where: { advisor_id: advisorId }
      }),
      prisma.student.count({
        where: {
          advisor_id: advisorId,
          OR: [
            { cumulative_gpa: { lt: AT_RISK_GPA_THRESHOLD } },
            { status: { in: AT_RISK_STATUS } }
          ]
        }
      }),
      prisma.studyPlan.findMany({
        where: {
          submitted_at: { not: null },
          student: { advisor_id: advisorId },
        },
        take: 5,
        orderBy: { created_at: "desc" },
        include: {
          student: {
            select: {
              student_id: true,
              cumulative_gpa: true,
              user: { select: { first_name: true, last_name: true } }
            }
          },
          semester: { select: { semester_name: true } },
          details: { include: { course: true } }
        }
      })
    ]);

  const recentPlanRequests = recentPlans.map((p) => {
    const requestedCredits = p.details.reduce((sum, d) => sum + d.course.credits, 0);
    return {
      plan_id: p.plan_id,
      studentId: p.student_id,
      studentName: `${p.student.user.first_name} ${p.student.user.last_name}`,
      studentCode: `S${String(p.student_id).padStart(7, "0")}`,
      gpa: Number(p.student.cumulative_gpa),
      requestedCredits,
      submissionDate: p.created_at,
      status: p.plan_status
    };
  });

  return {
    pendingRequestsCount,
    totalStudentsCount,
    atRiskStudentsCount,
    recentPlanRequests
  };
};
