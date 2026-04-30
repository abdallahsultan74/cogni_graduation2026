import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import { AppError } from "../utils/AppError.js";
import { UserRole } from "@prisma/client";

const slugifyFirstName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "user";

const buildRoleEmail = (firstName: string, userId: number, role: UserRole) => {
  const localPart = `${slugifyFirstName(firstName)}.${userId}`;
  const rolePart = role.toLowerCase();
  return `${localPart}@${rolePart}.eelu.edu.eg`;
};

export const createUser = async (data: any) => {

  const existingUser = await prisma.user.findUnique({
    where: { national_id: data.national_id }
  });

  if (existingUser)
    throw new AppError("National ID already exists", 400);

  const hashedPassword = await bcrypt.hash(data.password, 10);
  const role = data.role as UserRole;
  const provisionalEmail = `pending.${data.national_id}@${role.toLowerCase()}.eelu.edu.eg`;

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        first_name: data.first_name,
        middle_name: data.middle_name,
        last_name: data.last_name,
        national_id: data.national_id,
        personal_email: provisionalEmail,
        password_hash: hashedPassword,
        gender: data.gender,
        street_address: data.street_address,
        role
      }
    });

    const generatedEmail = buildRoleEmail(createdUser.first_name, createdUser.user_id, createdUser.role);
    const shouldUseProvidedEmail = Boolean(data.useProvidedEmail && data.personal_email);
    const finalEmail = shouldUseProvidedEmail ? String(data.personal_email).toLowerCase() : generatedEmail;

    const existingEmail = await tx.user.findFirst({
      where: {
        personal_email: finalEmail,
        NOT: { user_id: createdUser.user_id }
      },
      select: { user_id: true }
    });

    if (existingEmail)
      throw new AppError("Email already exists", 400);

    const updatedUser = await tx.user.update({
      where: { user_id: createdUser.user_id },
      data: { personal_email: finalEmail }
    });

    if (updatedUser.role === "STUDENT") {
      await tx.student.create({
        data: {
          student_id: updatedUser.user_id
        }
      });
    }

    if (updatedUser.role === "ADVISOR") {
      await tx.advisor.create({
        data: {
          advisor_id: updatedUser.user_id
        }
      });
    }

    if (updatedUser.role === "ADMIN") {
      await tx.admin.create({
        data: {
          admin_id: updatedUser.user_id
        }
      });
    }

    return updatedUser;
  });

  return user;
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
      where: { personal_email: defaultAdminEmail },
      select: { user_id: true }
    });

    if (!targetAdmin) {
      const legacyAdmin = await prisma.user.findUnique({
        where: { personal_email: legacyDefaultAdminEmail },
        select: { user_id: true }
      });

      if (legacyAdmin) {
        await prisma.user.update({
          where: { user_id: legacyAdmin.user_id },
          data: { personal_email: defaultAdminEmail }
        });
      }
    }

    return;
  }

  const existingByEmail = await prisma.user.findUnique({
    where: { personal_email: defaultAdminEmail }
  });

  const existingByNationalId = await prisma.user.findUnique({
    where: { national_id: defaultAdminNationalId }
  });

  if (existingByEmail || existingByNationalId) return;

  await createUser({
    first_name: "System",
    middle_name: "Default",
    last_name: "Admin",
    national_id: defaultAdminNationalId,
    personal_email: defaultAdminEmail,
    password: defaultAdminPassword,
    gender: "male",
    street_address: "N/A",
    role: "ADMIN",
    useProvidedEmail: true
  });
};

export const getAllUsers = async () => {
  return prisma.user.findMany({
    select: {
      user_id: true,
      first_name: true,
      last_name: true,
      national_id: true,
      personal_email: true,
      role: true
    }
  });
};

export const getUserById = async (id: number) => {
  return prisma.user.findUnique({
    where: { user_id: id }
  });
};

export const updateUser = async (id: number, data: any) => {

  return prisma.user.update({
    where: { user_id: id },
    data
  });
};

export const deleteUser = async (id: number, currentUserId?: number) => {
  const user = await prisma.user.findUnique({
    where: { user_id: id },
    include: { student: true, advisor: true, admin: true }
  });

  if (!user)
    throw new AppError("User not found", 404);

  if (currentUserId !== undefined && currentUserId === id)
    throw new AppError("Cannot delete your own account", 400);

  await prisma.$transaction(async (tx) => {
    await tx.notification.deleteMany({ where: { recipient_id: id } });

    if (user.student) {
      const studentId = user.student.student_id;
      const planIds = await tx.studyPlan.findMany({ where: { student_id: studentId }, select: { plan_id: true } }).then((p) => p.map((x) => x.plan_id));
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

    if (user.admin)
      await tx.admin.delete({ where: { admin_id: user.admin.admin_id } });

    await tx.user.delete({ where: { user_id: id } });
  });
};