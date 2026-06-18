import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_ADVISOR_EMAIL = "sara.20@advisor.eelu.edu.eg";
const DEMO_STUDENT_EMAILS = [
  "user.2200031@student.eelu.edu.eg",
  "user.2200032@student.eelu.edu.eg",
  "user.2200033@student.eelu.edu.eg",
  "user.2200037@student.eelu.edu.eg",
  "user.2200047@student.eelu.edu.eg",
  "user.2200035@student.eelu.edu.eg",
  "user.2200039@student.eelu.edu.eg",
  "user.2200048@student.eelu.edu.eg",
  "user.2200045@student.eelu.edu.eg",
  "user.2200049@student.eelu.edu.eg",
];

async function run() {
  const advisor = await prisma.advisor.findFirst({
    where: { user: { university_email: DEMO_ADVISOR_EMAIL } },
    select: { advisor_id: true },
  });
  if (!advisor) {
    console.error(`Advisor not found: ${DEMO_ADVISOR_EMAIL}`);
    return;
  }

  for (const email of DEMO_STUDENT_EMAILS) {
    const updated = await prisma.student.updateMany({
      where: { user: { university_email: email } },
      data: { advisor_id: advisor.advisor_id },
    });
    console.log(`Assigned ${email} → ${DEMO_ADVISOR_EMAIL} (${updated.count})`);
  }
}
run().finally(() => prisma.$disconnect());
