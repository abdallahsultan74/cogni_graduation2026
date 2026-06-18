/**
 * يوسف إبراهيم — طالب أول ترم: بدون تسجيلات سابقة، GPA 0
 * Usage: npx tsx src/scripts/fix_youssef_first_term.ts
 */
import { PrismaClient } from "@prisma/client";
import { ensureSemesters } from "./seed_semesters.js";

const EMAIL = "youssef.ibrahim.y1@student.eelu.edu.eg";
const prisma = new PrismaClient();

async function main() {
  await ensureSemesters();

  const user = await prisma.user.findUnique({
    where: { personal_email: EMAIL },
    include: { student: true },
  });

  if (!user?.student) {
    console.error(`Student not found: ${EMAIL}`);
    process.exit(1);
  }

  const studentId = user.student.student_id;

  const deleted = await prisma.enrollment.deleteMany({
    where: { student_id: studentId },
  });

  await prisma.student.update({
    where: { student_id: studentId },
    data: {
      level: 1,
      cumulative_gpa: 0,
      total_earned_hours: 0,
    },
  });

  // إزالة خطط قديمة مبنية على سجل خاطئ (اختياري — يعيد الطالب لبداية الفصل)
  const plans = await prisma.studyPlan.findMany({
    where: { student_id: studentId },
    select: { plan_id: true },
  });
  for (const p of plans) {
    await prisma.planDetail.deleteMany({ where: { plan_id: p.plan_id } });
    await prisma.studyPlan.delete({ where: { plan_id: p.plan_id } });
  }

  console.log(`✅ ${EMAIL}`);
  console.log(`   حذف ${deleted.count} تسجيل(ات)`);
  console.log(`   GPA: 0 | ساعات: 0 | مستوى: 1`);
  console.log(`   حذف ${plans.length} خطة دراسية قديمة`);
  console.log(`   الفصول الصيفية: Summer 2024 / 2025 / 2026 جاهزة في النظام`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
