import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function run() {
  const plans = await prisma.studyPlan.findMany({
    include: { details: true }
  });

  for (const plan of plans) {
    if (plan.details.length === 0) {
      console.log("Deleting empty plan:", plan.plan_id);
      await prisma.studyPlan.delete({
        where: { plan_id: plan.plan_id }
      });
    }
  }
}
run().finally(() => prisma.$disconnect());
