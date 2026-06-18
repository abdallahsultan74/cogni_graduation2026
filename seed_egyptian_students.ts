import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function run() {
  console.log("Seeding realistic Egyptian students...");

  const passwordHash = await bcrypt.hash("Password123", 10);

  const students = [
    {
      first_name: "محمود",
      last_name: "السيد",
      national_id: "29901" + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0'),
      personal_email: "mahmoud.elsayed@student.eelu.edu.eg",
      gender: "male",
      street_address: "15 شارع صلاح سالم، القاهرة",
      phone: "01012345678",
      major_type: "CS",
      level: 2,
      cumulative_gpa: 1.8,
      total_earned_hours: 30,
      enrollments: [
        { course_id: 5, status: "PASSED", grade: "D" }, // CS112
        { course_id: 24, status: "PASSED", grade: "C" }, // IT110
        { course_id: 6, status: "FAILED", grade: "F" }, // CS215 (Failed)
        { course_id: 18, status: "PASSED", grade: "B" }, // HU101
      ]
    },
    {
      first_name: "فاطمة",
      last_name: "أحمد",
      national_id: "29812" + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0'),
      personal_email: "fatma.ahmed@student.eelu.edu.eg",
      gender: "female",
      street_address: "10 ميدان التحرير، الإسكندرية",
      phone: "01198765432",
      major_type: "IT",
      level: 3,
      cumulative_gpa: 2.1,
      total_earned_hours: 60,
      enrollments: [
        { course_id: 5, status: "PASSED", grade: "B" }, // CS112
        { course_id: 6, status: "PASSED", grade: "C" }, // CS215
        { course_id: 24, status: "PASSED", grade: "A" }, // IT110
        { course_id: 7, status: "FAILED", grade: "F" }, // CS216 Data Structure (Failed)
        { course_id: 9, status: "FAILED", grade: "F" }, // CS318 (Failed)
      ]
    },
    {
      first_name: "عمر",
      last_name: "حسن",
      national_id: "30005" + Math.floor(Math.random() * 1000000000).toString().padStart(9, '0'),
      personal_email: "omar.hassan@student.eelu.edu.eg",
      gender: "male",
      street_address: "5 شارع عباس العقاد، مدينة نصر، القاهرة",
      phone: "01234567890",
      major_type: "AI",
      level: 4,
      cumulative_gpa: 1.9,
      total_earned_hours: 90,
      enrollments: [
        { course_id: 5, status: "PASSED", grade: "C" },
        { course_id: 6, status: "PASSED", grade: "C" },
        { course_id: 7, status: "PASSED", grade: "D" },
        { course_id: 1, status: "FAILED", grade: "F" }, // AI311 (Failed)
        { course_id: 2, status: "FAILED", grade: "F" }, // AI321 (Failed)
      ]
    }
  ];

  for (const s of students) {
    const existing = await prisma.user.findUnique({ where: { personal_email: s.personal_email } });
    if (existing) {
      console.log(`User ${s.personal_email} already exists, skipping...`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        first_name: s.first_name,
        last_name: s.last_name,
        national_id: s.national_id,
        personal_email: s.personal_email,
        password_hash: passwordHash,
        gender: s.gender,
        street_address: s.street_address,
        role: "STUDENT",
        phones: {
          create: [{ phone_number: s.phone }]
        },
        student: {
          create: {
            major_type: s.major_type,
            level: s.level,
            cumulative_gpa: s.cumulative_gpa,
            total_earned_hours: s.total_earned_hours,
            advisor_id: 20 // Assigning them all to test.36 advisor (ID 20)
          }
        }
      },
      include: {
        student: true
      }
    });

    console.log(`Created student ${user.first_name} ${user.last_name} with ID: ${user.user_id}`);

    // Add enrollments
    if (user.student) {
      for (const e of s.enrollments) {
        await prisma.enrollment.create({
          data: {
            student_id: user.student.student_id,
            course_id: e.course_id,
            status: e.status,
            grade: e.grade
          }
        });
      }
      console.log(`Added ${s.enrollments.length} enrollments for ${user.first_name}`);
    }
  }

  console.log("Seeding complete!");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
