import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  buildStudentUniversityEmail,
  buildRoleUniversityEmail,
  slugifyFirstName
} from "../utils/studentIdentity.js";

const prisma = new PrismaClient();
const __dirname = path.dirname(fileURLToPath(import.meta.url));

type PersonalEmailRow = {
  national_id?: string;
  university_email?: string;
  email?: string;
  personal_email?: string;
};

const loadPersonalEmailMap = () => {
  const map = new Map<string, string>();
  const jsonPath = path.join(__dirname, "../../docs/cogni-advisor-test-users.json");
  if (!fs.existsSync(jsonPath)) return map;

  const raw = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as {
    users?: PersonalEmailRow[];
  };

  for (const row of raw.users ?? []) {
    const nationalId = row.national_id?.trim();
    const personal =
      row.personal_email?.trim().toLowerCase() ??
      guessPersonalFromUniversity(row.email ?? row.university_email);
    if (nationalId && personal && !personal.endsWith(".eelu.edu.eg")) {
      map.set(nationalId, personal);
    }
  }

  return map;
};

const guessPersonalFromUniversity = (email?: string) => {
  if (!email) return undefined;
  const lower = email.toLowerCase();
  if (lower.endsWith("@student.eelu.edu.eg")) {
    const local = lower.split("@")[0]?.replace(/\./g, ".") ?? "student";
    return `${local}.demo@gmail.com`;
  }
  if (!lower.includes("@student.") && !lower.includes("@advisor.") && !lower.includes("@admin.")) {
    return lower;
  }
  return `${slugifyFirstName(localPartFromEmail(lower))}.demo@gmail.com`;
};

const localPartFromEmail = (email: string) => email.split("@")[0] ?? "student";

async function main() {
  const personalMap = loadPersonalEmailMap();
  let nextStudentNumeric = 2200001;

  const students = await prisma.student.findMany({
    include: { user: true },
    orderBy: { student_id: "asc" }
  });

  for (const student of students) {
    while (
      await prisma.student.findFirst({
        where: { university_student_id: String(nextStudentNumeric) },
        select: { student_id: true }
      })
    ) {
      nextStudentNumeric += 1;
    }

    const universityStudentId =
      student.university_student_id && /^220\d{4}$/.test(student.university_student_id)
        ? student.university_student_id
        : String(nextStudentNumeric++);

    const universityEmail = buildStudentUniversityEmail(
      student.user.first_name,
      universityStudentId
    );

    const mappedPersonal = personalMap.get(student.user.national_id);
    const legacyEmail = student.user.personal_email?.toLowerCase();
    const personalEmail =
      mappedPersonal ??
      (legacyEmail && !legacyEmail.endsWith(".eelu.edu.eg")
        ? legacyEmail
        : guessPersonalFromUniversity(legacyEmail ?? student.user.university_email));

    await prisma.student.update({
      where: { student_id: student.student_id },
      data: { university_student_id: universityStudentId }
    });

    await prisma.user.update({
      where: { user_id: student.user.user_id },
      data: {
        university_email: universityEmail,
        personal_email: personalEmail
      }
    });

    console.log(
      `Student ${student.student_id}: id=${universityStudentId}, uni=${universityEmail}, personal=${personalEmail}`
    );
  }

  const nonStudents = await prisma.user.findMany({
    where: { role: { in: ["ADVISOR", "ADMIN"] } },
    orderBy: { user_id: "asc" }
  });

  for (const user of nonStudents) {
    const universityEmail = buildRoleUniversityEmail(
      user.first_name,
      user.user_id,
      user.role
    );

    const legacy = user.personal_email?.toLowerCase();
    const personalEmail =
      legacy && !legacy.endsWith(".eelu.edu.eg")
        ? legacy
        : guessPersonalFromUniversity(legacy ?? user.university_email);

    await prisma.user.update({
      where: { user_id: user.user_id },
      data: {
        university_email: universityEmail,
        personal_email: personalEmail
      }
    });

    console.log(`${user.role} ${user.user_id}: uni=${universityEmail}, personal=${personalEmail}`);
  }

  console.log("Migration complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
