import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import { AppError } from "../utils/AppError.js";
import { UserRole } from "@prisma/client";
import {
  allocateUniversityStudentId,
  buildRoleUniversityEmail,
  buildStudentUniversityEmail,
  slugifyFirstName
} from "../utils/studentIdentity.js";

export const createUser = async (data: any) => {
  const existingUser = await prisma.user.findUnique({
    where: { national_id: data.national_id }
  });

  if (existingUser) throw new AppError("National ID already exists", 400);

  const role = data.role as UserRole;
  const personalEmail =
    typeof data.personal_email === "string" && data.personal_email.trim()
      ? data.personal_email.trim().toLowerCase()
      : null;

  if (role === "STUDENT" && !personalEmail) {
    throw new AppError("Personal email is required for students", 400);
  }

  if (personalEmail) {
    const existingPersonal = await prisma.user.findFirst({
      where: { personal_email: personalEmail },
      select: { user_id: true }
    });
    if (existingPersonal) throw new AppError("Personal email already exists", 400);
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const provisionalUniversityEmail = `pending.${data.national_id}@${role.toLowerCase()}.eelu.edu.eg`;

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
        national_id: data.national_id,
        university_email: provisionalUniversityEmail,
        personal_email: personalEmail,
        password_hash: hashedPassword,
        gender: data.gender,
        street_address: data.street_address,
        role
      }
    });

    let finalUniversityEmail = buildRoleUniversityEmail(
      createdUser.first_name,
      createdUser.user_id,
      createdUser.role
    );

    if (createdUser.role === "STUDENT") {
      const universityStudentId = await allocateUniversityStudentId();
      finalUniversityEmail = buildStudentUniversityEmail(
        createdUser.first_name,
        universityStudentId
      );

      const existingUniversityEmail = await tx.user.findFirst({
        where: {
          university_email: finalUniversityEmail,
          NOT: { user_id: createdUser.user_id }
        },
        select: { user_id: true }
      });

      if (existingUniversityEmail) throw new AppError("University email already exists", 400);

      await tx.student.create({
        data: {
          student_id: createdUser.user_id,
          university_student_id: universityStudentId
        }
      });
    }

    if (createdUser.role === "ADVISOR") {
      await tx.advisor.create({
        data: { advisor_id: createdUser.user_id }
      });
    }

    if (createdUser.role === "ADMIN") {
      await tx.admin.create({
        data: { admin_id: createdUser.user_id }
      });
    }

    const updatedUser = await tx.user.update({
      where: { user_id: createdUser.user_id },
      data: { university_email: finalUniversityEmail },
      include: { student: true }
    });

    return updatedUser;
  });

  return prisma.user.findUnique({
    where: { user_id: user.user_id },
    include: { student: true }
  });
};

export const ensureDefaultAdmin = async () => {
  const hasAdmin = await prisma.admin.findFirst({
    select: { admin_id: true }
  });

  const defaultAdminEmail = (process.env.DEFAULT_ADMIN_EMAIL ?? "admin@admin.eelu.edu.eg").toLowerCase();
  const defaultAdminPassword = process.env.DEFAULT_ADMIN_PASSWORD ?? "Admin@12345";
  const defaultAdminNationalId = process.env.DEFAULT_ADMIN_NATIONAL_ID ?? "10000000000000";
  const legacyDefaultAdminEmail = "admin@cogniadvisor.com";

  if (hasAdmin) {
    const targetAdmin = await prisma.user.findUnique({
      where: { university_email: defaultAdminEmail },
      select: { user_id: true }
    });

    if (!targetAdmin) {
      const legacyAdmin = await prisma.user.findUnique({
        where: { university_email: legacyDefaultAdminEmail },
        select: { user_id: true }
      });

      if (legacyAdmin) {
        await prisma.user.update({
          where: { user_id: legacyAdmin.user_id },
          data: { university_email: defaultAdminEmail }
        });
      }
    }

    return;
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { university_email: defaultAdminEmail }
  });

  const existingByNationalId = await prisma.user.findUnique({
    where: { national_id: defaultAdminNationalId }
  });

  if (existingByEmail || existingByNationalId) return;

  const created = await createUser({
    first_name: "System",
    middle_name: "Default",
    last_name: "Admin",
    national_id: defaultAdminNationalId,
    password: defaultAdminPassword,
    gender: "male",
    street_address: "N/A",
    role: "ADMIN"
  });

  await prisma.user.update({
    where: { user_id: created!.user_id },
    data: { university_email: defaultAdminEmail }
  });
};

export const getAllUsers = async (role?: string) => {
  const whereClause = role ? { role: role as UserRole } : undefined;

  return prisma.user.findMany({
    where: whereClause,
    select: {
      user_id: true,
      first_name: true,
      last_name: true,
      national_id: true,
      university_email: true,
      personal_email: true,
      role: true,
      student: {
        select: {
          student_id: true,
          university_student_id: true,
          advisor_id: true,
          status: true
        }
      },
      advisor: {
        select: {
          advisor_id: true,
          office_hours: true,
          bio: true
        }
      }
    }
  });
};

export const getUserById = async (id: number) => {
  return prisma.user.findUnique({
    where: { user_id: id },
    include: { student: true }
  });
};

export const updateUser = async (id: number, data: any) => {
  const payload: Record<string, unknown> = {};

  if (data.first_name !== undefined) payload.first_name = data.first_name;
  if (data.last_name !== undefined) payload.last_name = data.last_name;
  if (data.gender !== undefined) payload.gender = data.gender;
  if (data.street_address !== undefined) payload.street_address = data.street_address;

  if (data.personal_email !== undefined) {
    const normalized = String(data.personal_email).trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: {
        personal_email: normalized,
        NOT: { user_id: id }
      },
      select: { user_id: true }
    });
    if (existing) throw new AppError("Personal email already exists", 400);
    payload.personal_email = normalized;
  }

  return prisma.user.update({
    where: { user_id: id },
    data: payload
  });
};

export const deleteUser = async (id: number, currentUserId?: number) => {
  const user = await prisma.user.findUnique({
    where: { user_id: id },
    include: { student: true, advisor: true, admin: true }
  });

  if (!user) throw new AppError("User not found", 404);

  if (currentUserId !== undefined && currentUserId === id) {
    throw new AppError("Cannot delete your own account", 400);
  }

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { recipient_id: id } });
    await tx.passwordResetToken.deleteMany({ where: { user_id: id } });

    if (user.student) {
      const studentId = user.student.student_id;
      const planIds = await tx.studyPlan
        .findMany({ where: { student_id: studentId }, select: { plan_id: true } })
        .then((p) => p.map((x) => x.plan_id));
      if (planIds.length) await tx.planDetail.deleteMany({ where: { plan_id: { in: planIds } } });
      await tx.studyPlan.deleteMany({ where: { student_id: studentId } });
      await tx.enrollment.deleteMany({ where: { student_id: studentId } });
      await tx.feedback.deleteMany({ where: { student_id: studentId } });
      await tx.semesterRecord.deleteMany({ where: { student_id: studentId } });
      await tx.student.delete({ where: { student_id: studentId } });
    }

    if (user.advisor) {
      const advisorId = user.advisor.advisor_id;
      await tx.feedback.deleteMany({ where: { advisor_id: advisorId } });
      await tx.studyPlan.updateMany({ where: { advisor_id: advisorId }, data: { advisor_id: null } });
      await tx.advisor.delete({ where: { advisor_id: advisorId } });
    }

    if (user.admin) await tx.admin.delete({ where: { admin_id: user.admin.admin_id } });

    await tx.user.delete({ where: { user_id: id } });
  });
};

export { slugifyFirstName };
