import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const SEMESTER_DEFINITIONS = [
  { id: 1, name: "Fall 2023", start: "2023-09-01", end: "2024-01-15" },
  { id: 2, name: "Spring 2024", start: "2024-02-01", end: "2024-06-15" },
  { id: 8, name: "Summer 2024", start: "2024-07-01", end: "2024-08-15" },
  { id: 3, name: "Fall 2024", start: "2024-09-01", end: "2025-01-15" },
  { id: 4, name: "Spring 2025", start: "2025-02-01", end: "2025-06-15" },
  { id: 9, name: "Summer 2025", start: "2025-07-01", end: "2025-08-15" },
  { id: 5, name: "Fall 2025", start: "2025-09-01", end: "2026-01-15" },
  { id: 6, name: "Spring 2026", start: "2026-02-01", end: "2026-06-15" },
  { id: 10, name: "Summer 2026", start: "2026-07-01", end: "2026-08-15" },
  { id: 7, name: "Fall 2026", start: "2026-09-01", end: "2027-01-15" },
] as const;

export type SemesterKey =
  | "fall2023"
  | "spring2024"
  | "summer2024"
  | "fall2024"
  | "spring2025"
  | "summer2025"
  | "fall2025"
  | "spring2026"
  | "summer2026"
  | "fall2026";

export const SEMESTER_KEY_TO_ID: Record<SemesterKey, number> = {
  fall2023: 1,
  spring2024: 2,
  summer2024: 8,
  fall2024: 3,
  spring2025: 4,
  summer2025: 9,
  fall2025: 5,
  spring2026: 6,
  summer2026: 10,
  fall2026: 7,
};

export async function ensureSemesters() {
  for (const s of SEMESTER_DEFINITIONS) {
    await prisma.semester.upsert({
      where: { semester_id: s.id },
      update: {
        semester_name: s.name,
        start_date: new Date(s.start),
        end_date: new Date(s.end),
      },
      create: {
        semester_id: s.id,
        semester_name: s.name,
        start_date: new Date(s.start),
        end_date: new Date(s.end),
      },
    });
  }
  console.log(`✅ ${SEMESTER_DEFINITIONS.length} semesters ready`);
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  ensureSemesters()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
