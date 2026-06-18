import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcrypt";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { ensureSemesters } from "./seed_semesters.js";
import { semesterIdForCourse } from "./fix_enrollment_semesters.js";
import {
  allocateUniversityStudentId,
  buildStudentUniversityEmail,
  slugifyFirstName
} from "../utils/studentIdentity.js";

const prisma = new PrismaClient();

const GRADE_POINTS: Record<string, number> = {
  "A+": 4.0,
  A: 3.7,
  "B+": 3.3,
  B: 3.0,
  "C+": 2.7,
  C: 2.4,
  "D+": 2.2,
  D: 2.0,
  F: 0.0,
};

type EnrollmentSeed = {
  course_code: string;
  grade: string;
  status?: string;
};

type StudentSeed = {
  first_name: string;
  last_name: string;
  national_id: string;
  personal_email: string;
  /** Legacy seed field: university login email before migration naming */
  university_email?: string;
  gender: string;
  street_address: string;
  phone: string;
  major_type: "IT" | "AI";
  level: number;
  enrollments: EnrollmentSeed[];
};

const YEAR1_FIRST = ["IT111", "MA111", "HU111", "HU113", "MA112", "IT110"];
const YEAR1_SECOND = ["ST121", "HU112", "MA113", "HU101", "IT113", "IT114"];
const YEAR2_FIRST = ["IT215", "DS211", "MA214", "IT231", "ST222", "IT240"];
const YEAR2_SECOND = ["IT217", "IT216", "AI321", "HU427", "IT230", "LB211"];
const YEAR3_FIRST = ["LB312", "AI311", "CS319", "IT212", "CS318", "CS341"];
const YEAR3_SECOND = ["IT322", "IT333", "AI448", "CS344", "IT343", "LB313"];
const YEAR4_FIRST = ["LB421", "IT423", "IT221", "IT434", "PC401", "IT438"];
const YEAR4_SECOND = ["IT439", "IT436", "CS449", "HU402", "PC402", "LB431"];

const withGrades = (codes: string[], grades: string[]): EnrollmentSeed[] =>
  codes.map((course_code, i) => ({
    course_code,
    grade: grades[i] ?? "B",
    status: "PASSED",
  }));

const students: StudentSeed[] = [
  // السنة الأولى — 4 طلاب
  // يوسف — طالب سنة أولى، أول ترم (لا سجل أكاديمي سابق)
  {
    first_name: "يوسف",
    last_name: "إبراهيم",
    national_id: "29901150100001",
    personal_email: "youssef.ibrahim.y1@student.eelu.edu.eg",
    gender: "male",
    street_address: "15 شارع الجامعة، المنصورة",
    phone: "01011110001",
    major_type: "IT",
    level: 1,
    enrollments: [],
  },
  {
    first_name: "نورهان",
    last_name: "محمود",
    national_id: "29902150200002",
    personal_email: "nourhan.mahmoud.y1@student.eelu.edu.eg",
    gender: "female",
    street_address: "8 شارع النيل، القاهرة",
    phone: "01011110002",
    major_type: "IT",
    level: 1,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["B+", "A", "B", "A", "B+", "A"]),
      ...withGrades(YEAR1_SECOND, ["B", "A", "B+", "A", "B", "A"]),
    ],
  },
  {
    first_name: "كريم",
    last_name: "عادل",
    national_id: "29903150300003",
    personal_email: "karim.adel.y1@student.eelu.edu.eg",
    gender: "male",
    street_address: "22 شارع سعد زغلول، طنطا",
    phone: "01011110003",
    major_type: "IT",
    level: 1,
    enrollments: withGrades(YEAR1_FIRST.slice(0, 3), ["B", "C+", "B"]),
  },
  {
    first_name: "سلمى",
    last_name: "حسين",
    national_id: "29904150400004",
    personal_email: "salma.hussein.y1@student.eelu.edu.eg",
    gender: "female",
    street_address: "5 شارع المعادي، القاهرة",
    phone: "01011110004",
    major_type: "AI",
    level: 1,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["A", "B+", "A", "B", "A", "B+"]),
      ...withGrades(YEAR1_SECOND.slice(0, 4), ["B+", "A", "B", "A"]),
    ],
  },

  // السنة الثانية — 4 طلاب
  {
    first_name: "عمر",
    last_name: "طارق",
    national_id: "29805150500005",
    personal_email: "omar.tarek.y2@student.eelu.edu.eg",
    gender: "male",
    street_address: "12 شارع الجيش، الإسكندرية",
    phone: "01011110005",
    major_type: "IT",
    level: 2,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["B", "B+", "B", "A", "B", "B+"]),
      ...withGrades(YEAR1_SECOND, ["B+", "A", "B", "B+", "B", "A"]),
    ],
  },
  {
    first_name: "مريم",
    last_name: "سامي",
    national_id: "29806150600006",
    personal_email: "mariam.sami.y2@student.eelu.edu.eg",
    gender: "female",
    street_address: "3 شارع الهرم، الجيزة",
    phone: "01011110006",
    major_type: "IT",
    level: 2,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["A", "B+", "A", "B+", "A", "B+"]),
      ...withGrades(YEAR1_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR2_FIRST.slice(0, 4), ["B", "B+", "A", "B"]),
    ],
  },
  {
    first_name: "حسام",
    last_name: "رامي",
    national_id: "29807150700007",
    personal_email: "hossam.ramy.y2@student.eelu.edu.eg",
    gender: "male",
    street_address: "7 شارع بورسعيد، دمياط",
    phone: "01011110007",
    major_type: "IT",
    level: 2,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["C", "D+", "C+", "C", "D", "C"]),
      ...withGrades(YEAR1_SECOND, ["C+", "C", "D+", "C", "D", "C+"]),
      ...withGrades(YEAR2_FIRST, ["C", "C+", "D+", "C", "C+", "C"]),
      ...withGrades(YEAR2_SECOND, ["C+", "C", "C", "B", "C", "B"]),
    ],
  },
  {
    first_name: "دينا",
    last_name: "كمال",
    national_id: "29808150800008",
    personal_email: "dina.kamal.y2@student.eelu.edu.eg",
    gender: "female",
    street_address: "19 شارع التحرير، القاهرة",
    phone: "01011110008",
    major_type: "AI",
    level: 2,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["B+", "A", "B", "A", "B+", "A"]),
      ...withGrades(YEAR1_SECOND, ["B+", "A", "B+", "A", "B", "A"]),
      ...withGrades(YEAR2_FIRST, ["B+", "A", "B", "B+", "A", "B+"]),
      ...withGrades(YEAR2_SECOND, ["B", "B+", "A", "B+", "B", "A"]),
    ],
  },

  // السنة الثالثة — 4 طلاب
  {
    first_name: "إياد",
    last_name: "فتحي",
    national_id: "29709150900009",
    personal_email: "eyad.fathy.y3@student.eelu.edu.eg",
    gender: "male",
    street_address: "4 شارع الجامعة، الزقازيق",
    phone: "01011110009",
    major_type: "IT",
    level: 3,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["B+", "B", "A", "B", "B+", "A"]),
      ...withGrades(YEAR1_SECOND, ["B", "A", "B+", "B", "B+", "A"]),
      ...withGrades(YEAR2_FIRST, ["B+", "B", "A", "B", "B+", "A"]),
      ...withGrades(YEAR2_SECOND, ["B", "B+", "A", "B", "B+", "A"]),
    ],
  },
  {
    first_name: "رنا",
    last_name: "شوقي",
    national_id: "29710151000010",
    personal_email: "rana.shawky.y3@student.eelu.edu.eg",
    gender: "female",
    street_address: "11 شارع الهرم، الجيزة",
    phone: "01011110010",
    major_type: "IT",
    level: 3,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["A", "B+", "A", "B+", "A", "B+"]),
      ...withGrades(YEAR1_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR2_FIRST, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR2_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR3_FIRST.slice(0, 3), ["B+", "A", "B"]),
      { course_code: "TR211", grade: "B+", status: "PASSED" },
    ],
  },
  {
    first_name: "طارق",
    last_name: "نبيل",
    national_id: "29711151100011",
    personal_email: "tarek.nabil.y3@student.eelu.edu.eg",
    gender: "male",
    street_address: "6 شارع النصر، أسيوط",
    phone: "01011110011",
    major_type: "IT",
    level: 3,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["B", "B+", "B", "A", "B", "B+"]),
      ...withGrades(YEAR1_SECOND, ["B+", "B", "B+", "A", "B", "B+"]),
      ...withGrades(YEAR2_FIRST, ["B", "B+", "B", "A", "B", "B+"]),
      ...withGrades(YEAR2_SECOND, ["B+", "B", "B+", "A", "B", "B+"]),
      ...withGrades(YEAR3_FIRST, ["B+", "B", "A", "B", "B+", "A"]),
      ...withGrades(YEAR3_SECOND, ["B", "B+", "A", "B", "B+", "A"]),
    ],
  },
  {
    first_name: "هدى",
    last_name: "عمرو",
    national_id: "29712151200012",
    personal_email: "hoda.amr.y3@student.eelu.edu.eg",
    gender: "female",
    street_address: "2 شارع الجامعة، المنيا",
    phone: "01011110012",
    major_type: "AI",
    level: 3,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["A", "B+", "A", "B+", "A", "B+"]),
      ...withGrades(YEAR1_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR2_FIRST, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR2_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR3_FIRST, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR3_SECOND.slice(0, 4), ["B+", "A", "B+", "A"]),
    ],
  },

  // السنة الرابعة — 4 طلاب
  {
    first_name: "باسم",
    last_name: "وليد",
    national_id: "29613151300013",
    personal_email: "bassem.waleed.y4@student.eelu.edu.eg",
    gender: "male",
    street_address: "9 شارع الجامعة، بنها",
    phone: "01011110013",
    major_type: "IT",
    level: 4,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["B+", "A", "B", "A", "B+", "A"]),
      ...withGrades(YEAR1_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR2_FIRST, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR2_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR3_FIRST, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR3_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      { course_code: "TR211", grade: "A", status: "PASSED" },
    ],
  },
  {
    first_name: "ياسمين",
    last_name: "هشام",
    national_id: "29614151400014",
    personal_email: "yasmin.hesham.y4@student.eelu.edu.eg",
    gender: "female",
    street_address: "14 شارع الهرم، الجيزة",
    phone: "01011110014",
    major_type: "IT",
    level: 4,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["A", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR1_SECOND, ["A", "B+", "A", "B+", "A", "B+"]),
      ...withGrades(YEAR2_FIRST, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR2_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR3_FIRST, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR3_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      { course_code: "TR211", grade: "A", status: "PASSED" },
      ...withGrades(YEAR4_FIRST.slice(0, 3), ["B+", "A", "B+"]),
    ],
  },
  {
    first_name: "مصطفى",
    last_name: "جمال",
    national_id: "29615151500015",
    personal_email: "mostafa.gamal.y4@student.eelu.edu.eg",
    gender: "male",
    street_address: "20 شارع الجامعة، كفر الشيخ",
    phone: "01011110015",
    major_type: "IT",
    level: 4,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["B", "B+", "B", "A", "B", "B+"]),
      ...withGrades(YEAR1_SECOND, ["B+", "B", "B+", "A", "B", "B+"]),
      ...withGrades(YEAR2_FIRST, ["B", "B+", "B", "A", "B", "B+"]),
      ...withGrades(YEAR2_SECOND, ["B+", "B", "B+", "A", "B", "B+"]),
      ...withGrades(YEAR3_FIRST, ["B+", "B", "A", "B", "B+", "A"]),
      ...withGrades(YEAR3_SECOND, ["B", "B+", "A", "B", "B+", "A"]),
      { course_code: "TR211", grade: "B+", status: "PASSED" },
      ...withGrades(YEAR4_FIRST, ["B+", "A", "B", "B+", "B", "A"]),
      ...withGrades(YEAR4_SECOND.slice(0, 3), ["B+", "A", "B"]),
    ],
  },
  {
    first_name: "ليلى",
    last_name: "أشرف",
    national_id: "29616151600016",
    personal_email: "layla.ashraf.y4@student.eelu.edu.eg",
    gender: "female",
    street_address: "1 شارع النيل، أسوان",
    phone: "01011110016",
    major_type: "AI",
    level: 4,
    enrollments: [
      ...withGrades(YEAR1_FIRST, ["A", "B+", "A", "B+", "A", "B+"]),
      ...withGrades(YEAR1_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR2_FIRST, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR2_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR3_FIRST, ["B+", "A", "B+", "A", "B+", "A"]),
      ...withGrades(YEAR3_SECOND, ["B+", "A", "B+", "A", "B+", "A"]),
      { course_code: "TR211", grade: "A", status: "PASSED" },
      ...withGrades(YEAR4_FIRST, ["B+", "A", "B+", "A", "B", "A"]),
      ...withGrades(YEAR4_SECOND, ["B+", "A", "B+", "A", "B", "A"]),
    ],
  },
];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const catalogPath = path.resolve(
  __dirname,
  "../../cogni-advisor-ai/GP/recommendation/data/courses.json"
);
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf-8")) as Array<{
  code: string;
  credit_hours: number;
}>;
const creditByCode = new Map(catalog.map((c) => [c.code, c.credit_hours]));

const computeStats = (enrollments: EnrollmentSeed[]) => {
  let totalHours = 0;
  let weighted = 0;
  let gradedHours = 0;

  for (const e of enrollments) {
    const hours = creditByCode.get(e.course_code) ?? 3;
    totalHours += hours;
    const points = GRADE_POINTS[e.grade] ?? 0;
    if (e.grade !== "F") {
      weighted += points * hours;
      gradedHours += hours;
    }
  }

  const gpa = gradedHours > 0 ? Number((weighted / gradedHours).toFixed(2)) : 0;
  return { totalHours, gpa };
};

async function run() {
  console.log("Seeding 16 students by academic level (2023 bylaws)...");
  await ensureSemesters();

  const passwordHash = await bcrypt.hash("Password123", 10);

  const advisor = await prisma.user.findFirst({
    where: { role: UserRole.ADVISOR },
    include: { advisor: true },
  });
  const advisorId = advisor?.advisor?.advisor_id ?? null;

  for (const s of students) {
    const legacyUniversityEmail = s.university_email ?? s.personal_email;
    const existing = await prisma.user.findFirst({
      where: {
        OR: [
          { university_email: legacyUniversityEmail },
          { national_id: s.national_id }
        ]
      },
    });
    if (existing) {
      console.log(`Skip existing ${legacyUniversityEmail}`);
      continue;
    }

    const { totalHours, gpa } = computeStats(s.enrollments);
    const universityStudentId = await allocateUniversityStudentId();
    const universityEmail = buildStudentUniversityEmail(s.first_name, universityStudentId);
    const personalEmail = legacyUniversityEmail.endsWith(".eelu.edu.eg")
      ? `${slugifyFirstName(s.first_name)}.${slugifyFirstName(s.last_name)}.demo@gmail.com`
      : legacyUniversityEmail;

    const user = await prisma.user.create({
      data: {
        first_name: s.first_name,
        last_name: s.last_name,
        national_id: s.national_id,
        university_email: universityEmail,
        personal_email: personalEmail,
        password_hash: passwordHash,
        gender: s.gender,
        street_address: s.street_address,
        role: "STUDENT",
        phones: { create: [{ phone_number: s.phone }] },
        student: {
          create: {
            university_student_id: universityStudentId,
            major_type: s.major_type,
            level: s.level,
            cumulative_gpa: gpa,
            total_earned_hours: totalHours,
            advisor_id: advisorId,
          },
        },
      },
      include: { student: true },
    });

    if (!user.student) continue;

    for (const e of s.enrollments) {
      const course = await prisma.course.findUnique({
        where: { course_code: e.course_code },
      });
      if (!course) {
        console.warn(`Missing course ${e.course_code} for ${universityEmail}`);
        continue;
      }

      await prisma.enrollment.create({
        data: {
          student_id: user.student.student_id,
          course_id: course.course_id,
          semester_id: semesterIdForCourse(e.course_code, s.major_type),
          status: e.status ?? "PASSED",
          grade: e.grade,
        },
      });
    }

    console.log(
      `Created ${s.first_name} ${s.last_name} (L${s.level}, ${s.major_type}) — ${s.enrollments.length} courses, GPA ${gpa}, ${totalHours}h`
    );
  }

  console.log("Done.");
}

run()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
