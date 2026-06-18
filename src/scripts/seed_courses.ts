import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const prisma = new PrismaClient();

async function seed() {
  console.log("Seeding courses from StudyPlanner union catalog...");

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dataDir = path.resolve(
      __dirname,
      "../../cogni-advisor-ai/GP/recommendation/data"
    );

    const itPath = path.join(dataDir, "courses_it.json");
    const aiPath = path.join(dataDir, "courses_ai.json");
    const unionPath = path.join(dataDir, "courses.json");

    const load = (p: string) => JSON.parse(fs.readFileSync(p, "utf-8")) as Array<{
      code: string;
      course_name: string;
      credit_hours: number;
      prerequisites: string[];
    }>;

    const byCode = new Map<string, ReturnType<typeof load>[number]>();
    for (const course of [...load(itPath), ...load(aiPath), ...load(unionPath)]) {
      byCode.set(course.code, course);
    }
    const coursesData = [...byCode.values()];

    console.log(`Found ${coursesData.length} unique courses (IT+AI union).`);

    for (const courseData of coursesData) {
      let requiredHours: number | null = null;
      for (const preReqCode of courseData.prerequisites) {
        if (preReqCode === "Passing 85 Credit Hours") requiredHours = 85;
        if (preReqCode === "Passing 60 Credit Hours") requiredHours = 60;
      }

      await prisma.course.upsert({
        where: { course_code: courseData.code },
        update: {
          course_name: courseData.course_name,
          credits: courseData.credit_hours,
          required_hours_to_take: requiredHours,
        },
        create: {
          course_code: courseData.code,
          course_name: courseData.course_name,
          credits: courseData.credit_hours,
          required_hours_to_take: requiredHours,
        },
      });
    }
    console.log("✅ All courses upserted.");

    await prisma.coursePrerequisite.deleteMany({});
    console.log("🔄 Cleared old prerequisite links.");

    let prereqCount = 0;
    for (const courseData of coursesData) {
      const course = await prisma.course.findUnique({
        where: { course_code: courseData.code },
      });
      if (!course) continue;

      for (const preReqCode of courseData.prerequisites) {
        if (
          preReqCode === "Passing 85 Credit Hours" ||
          preReqCode === "Passing 60 Credit Hours"
        ) {
          continue;
        }

        const prereqCourse = await prisma.course.findUnique({
          where: { course_code: preReqCode },
        });

        if (prereqCourse) {
          const existingLink = await prisma.coursePrerequisite.findUnique({
            where: {
              course_id_prereq_course_id: {
                course_id: course.course_id,
                prereq_course_id: prereqCourse.course_id,
              },
            },
          });

          if (!existingLink) {
            await prisma.coursePrerequisite.create({
              data: {
                course_id: course.course_id,
                prereq_course_id: prereqCourse.course_id,
              },
            });
            prereqCount++;
          }
        }
      }
    }
    console.log(`✅ Connected ${prereqCount} prerequisite links.`);

    const validCodes = new Set(coursesData.map((c) => c.code));
    const stale = await prisma.course.findMany({
      where: { course_code: { notIn: [...validCodes] } },
      select: { course_id: true, course_code: true },
    });
    if (stale.length > 0) {
      const staleIds = stale.map((c) => c.course_id);
      await prisma.planDetail.deleteMany({
        where: { course_id: { in: staleIds } },
      });
      await prisma.coursePrerequisite.deleteMany({
        where: {
          OR: [
            { course_id: { in: staleIds } },
            { prereq_course_id: { in: staleIds } },
          ],
        },
      });
      await prisma.enrollment.deleteMany({
        where: { course_id: { in: staleIds } },
      });
      await prisma.course.deleteMany({
        where: { course_id: { in: staleIds } },
      });
      console.log(
        `🗑️ Removed ${stale.length} stale courses: ${stale.map((c) => c.course_code).join(", ")}`
      );
    }

    console.log("🎉 Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
