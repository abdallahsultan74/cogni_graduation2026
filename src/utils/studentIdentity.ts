import prisma from "../config/prisma.js";

const UNIVERSITY_STUDENT_ID_PATTERN = /^220\d{4}$/;

export const isValidUniversityStudentId = (value: string) =>
  UNIVERSITY_STUDENT_ID_PATTERN.test(value);

export const slugifyFirstName = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "user";

export const buildStudentUniversityEmail = (
  firstName: string,
  universityStudentId: string
) => `${slugifyFirstName(firstName)}.${universityStudentId}@student.eelu.edu.eg`;

export const buildRoleUniversityEmail = (
  firstName: string,
  userId: number,
  role: "STUDENT" | "ADVISOR" | "ADMIN"
) => {
  const rolePart = role.toLowerCase();
  return `${slugifyFirstName(firstName)}.${userId}@${rolePart}.eelu.edu.eg`;
};

export const allocateUniversityStudentId = async (): Promise<string> => {
  const latest = await prisma.student.findFirst({
    where: {
      university_student_id: { startsWith: "220" }
    },
    orderBy: { university_student_id: "desc" },
    select: { university_student_id: true }
  });

  const nextNumeric = latest?.university_student_id
    ? Number.parseInt(latest.university_student_id, 10) + 1
    : 2200001;

  const candidate = String(nextNumeric);
  if (!isValidUniversityStudentId(candidate)) {
    throw new Error(`Unable to allocate university student id from ${candidate}`);
  }

  return candidate;
};

export const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!local || !domain) return "***";
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}***@${domain}`;
};
