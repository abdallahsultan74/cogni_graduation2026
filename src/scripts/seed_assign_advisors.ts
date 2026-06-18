import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEMO_ADVISOR_EMAIL = "sara.20@advisor.eelu.edu.eg";
/** طلاب العرض التوضيحي — يثبتون عند مرشدة سارة */
const DEMO_STUDENT_EMAILS = [
  "youssef.ibrahim.y1@student.eelu.edu.eg",
  "nourhan.mahmoud.y1@student.eelu.edu.eg",
  "karim.adel.y1@student.eelu.edu.eg",
  "hossam.ramy.y2@student.eelu.edu.eg",
  "failed.y2@student.eelu.edu.eg",
  "omar.tarek.y2@student.eelu.edu.eg",
  "eyad.fathy.y3@student.eelu.edu.eg",
  "repeat.y3@student.eelu.edu.eg",
  "mostafa.gamal.y4@student.eelu.edu.eg",
  "atrisk.y1@student.eelu.edu.eg",
];

async function assignStudentsToAdvisors() {
  const advisors = await prisma.advisor.findMany({
    include: { user: true },
    orderBy: { advisor_id: "asc" },
  });

  if (advisors.length === 0) {
    console.log("No advisors found — skip assignment");
    return;
  }

  const demoAdvisor = advisors.find((a) => a.user.personal_email === DEMO_ADVISOR_EMAIL);
  const demoEmails = new Set(DEMO_STUDENT_EMAILS);

  if (demoAdvisor) {
    for (const email of DEMO_STUDENT_EMAILS) {
      const student = await prisma.student.findFirst({
        where: { user: { personal_email: email } },
        select: { student_id: true, advisor_id: true },
      });
      if (student && student.advisor_id !== demoAdvisor.advisor_id) {
        await prisma.student.update({
          where: { student_id: student.student_id },
          data: { advisor_id: demoAdvisor.advisor_id },
        });
        console.log(`  pinned ${email} → ${DEMO_ADVISOR_EMAIL}`);
      }
    }
  }

  const students = await prisma.student.findMany({
    where: demoAdvisor
      ? { user: { personal_email: { notIn: [...DEMO_STUDENT_EMAILS] } } }
      : undefined,
    orderBy: { student_id: "asc" },
  });

  let assigned = 0;
  for (let i = 0; i < students.length; i++) {
    const advisor = advisors[i % advisors.length];
    if (students[i].advisor_id !== advisor.advisor_id) {
      await prisma.student.update({
        where: { student_id: students[i].student_id },
        data: { advisor_id: advisor.advisor_id },
      });
      assigned++;
    }
  }

  console.log(`✅ Distributed ${students.length} students across ${advisors.length} advisors (${assigned} updated)`);
  for (const a of advisors) {
    const count = await prisma.student.count({
      where: { advisor_id: a.advisor_id },
    });
    console.log(`  ${a.user.first_name} ${a.user.last_name}: ${count} students`);
  }
}

assignStudentsToAdvisors()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
