import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  await prisma.studyPlan.updateMany({
    where: {
      student_id: 21 // The student ID for test.37
    },
    data: {
      plan_status: "PENDING",
      advisor_id: null
    }
  });
  console.log("Updated study plan status to PENDING");
}
run().finally(() => prisma.$disconnect());
