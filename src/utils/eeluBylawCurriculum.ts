import fs from "node:fs/promises";
import path from "node:path";
import prisma from "../config/prisma.js";

export type EeluCourseRow = {
  code: string;
  name: string;
  credit_hours: number;
  lecture_hours: string;
  exercise_lab_hours: string;
  prerequisite: string;
  course_id?: number;
  is_available?: boolean;
};

export type EeluSemesterBlock = {
  key: string;
  yearLabel: string;
  semesterLabel: string;
  label: string;
  sortOrder: number;
  totalCreditHours?: number;
  courses: EeluCourseRow[];
};

export type EeluCurriculum = {
  source: string;
  program: string;
  blocks: EeluSemesterBlock[];
};

const YEAR_ORDER: Record<string, number> = {
  first: 1,
  second: 2,
  third: 3,
  fourth: 4,
};

const YEAR_LABELS: Record<string, string> = {
  first: "(First Year)",
  second: "(Second year)",
  third: "(Third year)",
  fourth: "(Fourth year)",
};

const SEM_ORDER: Record<string, number> = {
  first: 1,
  second: 2,
};

const resolveBylawPath = (): string =>
  process.env.COGNI_ADVISOR_BYLAW_PATH ??
  path.resolve(process.cwd(), "cogni-advisor-ai/GP/recommendation/data/bylaw_in.json");

let cachedCurriculum: EeluCurriculum | null = null;

const normalizeCode = (value: unknown): string => {
  const text = String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "");
  if (text === "HU413") return "HU113";
  return text;
};

const readString = (value: unknown): string => {
  const text = String(value ?? "").trim();
  return text === "-" ? "" : text;
};

const readNumber = (value: unknown): number => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

const sortOrderFor = (yearKey: string, semKey: string): number =>
  (YEAR_ORDER[yearKey] ?? 99) * 10 + (SEM_ORDER[semKey] ?? 99);

const parseStandardYearBlocks = (
  data: Record<string, unknown>
): EeluSemesterBlock[] => {
  const blocks: EeluSemesterBlock[] = [];

  for (const yearKey of Object.keys(YEAR_ORDER)) {
    for (const semKey of Object.keys(SEM_ORDER)) {
      const prefix = `${yearKey}_year_${semKey}_semester_course_`;
      const courses: EeluCourseRow[] = [];

      for (let i = 1; i <= 12; i++) {
        const code = data[`${prefix}${i}_code`];
        if (!code) break;
        courses.push({
          code: normalizeCode(code),
          name: readString(data[`${prefix}${i}_name`]),
          credit_hours: readNumber(data[`${prefix}${i}_credit_hours`]),
          lecture_hours: readString(data[`${prefix}${i}_lecture_hours`]),
          exercise_lab_hours: readString(data[`${prefix}${i}_exercise_lab_hours`]),
          prerequisite: readString(data[`${prefix}${i}_prerequisite`]),
        });
      }

      if (courses.length === 0) continue;

      const totalKey = `${yearKey}_year_${semKey}_semester_total_credit_hours`;
      blocks.push({
        key: `${yearKey}-${semKey}`,
        yearLabel: YEAR_LABELS[yearKey],
        semesterLabel: semKey === "first" ? "First semester" : "Second semester",
        label: `${YEAR_LABELS[yearKey]} — ${semKey === "first" ? "First semester" : "Second semester"}`,
        sortOrder: sortOrderFor(yearKey, semKey),
        totalCreditHours: readNumber(data[totalKey]) || undefined,
        courses,
      });
    }
  }

  return blocks;
};

const parseIndexedSemester = (
  data: Record<string, unknown>,
  yearKey: string,
  semKey: "first" | "second",
  codePrefix: string,
  namePrefix: string,
  creditPrefix: string,
  lecturePrefix: string,
  labPrefix: string,
  prereqPrefix: string,
  totalKey: string
): EeluSemesterBlock | null => {
  const courses: EeluCourseRow[] = [];

  for (let i = 1; i <= 12; i++) {
    const code = data[`${codePrefix}${i}`];
    if (!code) break;
    courses.push({
      code: normalizeCode(code),
      name: readString(data[`${namePrefix}${i}`]),
      credit_hours: readNumber(data[`${creditPrefix}${i}`]),
      lecture_hours: readString(data[`${lecturePrefix}${i}`]),
      exercise_lab_hours: readString(data[`${labPrefix}${i}`]),
      prerequisite: readString(data[`${prereqPrefix}${i}`]),
    });
  }

  if (courses.length === 0) return null;

  return {
    key: `${yearKey}-${semKey}`,
    yearLabel: YEAR_LABELS[yearKey],
    semesterLabel: semKey === "first" ? "First semester" : "Second semester",
    label: `${YEAR_LABELS[yearKey]} — ${semKey === "first" ? "First semester" : "Second semester"}`,
    sortOrder: sortOrderFor(yearKey, semKey),
    totalCreditHours: readNumber(data[totalKey]) || undefined,
    courses,
  };
};

const parseDetailedSemester = (
  data: Record<string, unknown>,
  yearKey: string,
  semKey: "first" | "second",
  totalKey: string
): EeluSemesterBlock | null => {
  const prefix = `${semKey}_semester_course_`;
  const courses: EeluCourseRow[] = [];

  for (let i = 1; i <= 12; i++) {
    const code = data[`${prefix}${i}_code`];
    if (!code) break;
    courses.push({
      code: normalizeCode(code),
      name: readString(data[`${prefix}${i}_name`]),
      credit_hours: readNumber(data[`${prefix}${i}_credit_hours`]),
      lecture_hours: readString(data[`${prefix}${i}_lecture_hours`]),
      exercise_lab_hours: readString(data[`${prefix}${i}_exercise_lab_hours`]),
      prerequisite: readString(data[`${prefix}${i}_prerequisite`]),
    });
  }

  if (courses.length === 0) return null;

  return {
    key: `${yearKey}-${semKey}`,
    yearLabel: YEAR_LABELS[yearKey],
    semesterLabel: semKey === "first" ? "First semester" : "Second semester",
    label: `${YEAR_LABELS[yearKey]} — ${semKey === "first" ? "First semester" : "Second semester"}`,
    sortOrder: sortOrderFor(yearKey, semKey),
    totalCreditHours: readNumber(data[totalKey]) || undefined,
    courses,
  };
};

export const parseEeluBylawCurriculum = (
  data: Record<string, unknown>
): EeluCurriculum => {
  const   blocks: EeluSemesterBlock[] = [
    ...parseStandardYearBlocks(data),
    parseDetailedSemester(data, "fourth", "first", "first_semester_total_credit_hours"),
    parseDetailedSemester(data, "fourth", "second", "second_semester_total_credit_hours"),
  ].filter(Boolean) as EeluSemesterBlock[];

  blocks.sort((a, b) => a.sortOrder - b.sortOrder);

  return {
    source: "eelulaw.pdf",
    program: "Bachelor Degree Program In Information Technology",
    blocks,
  };
};

export const loadEeluBylawCurriculum = async (): Promise<EeluCurriculum> => {
  if (cachedCurriculum) return cachedCurriculum;
  const raw = await fs.readFile(resolveBylawPath(), "utf-8");
  const json = JSON.parse(raw) as Record<string, unknown>;
  cachedCurriculum = parseEeluBylawCurriculum(json);
  return cachedCurriculum;
};

export const mergeCurriculumWithDb = async (
  curriculum: EeluCurriculum
): Promise<EeluCurriculum> => {
  const dbCourses = await prisma.course.findMany();
  const byCode = new Map<string, (typeof dbCourses)[number]>();
  for (const c of dbCourses) {
    byCode.set(normalizeCode(c.course_code), c);
  }

  return {
    ...curriculum,
    blocks: curriculum.blocks.map((block) => ({
      ...block,
      courses: block.courses.map((row) => {
        const db = byCode.get(row.code);
        return db
          ? {
              ...row,
              course_id: db.course_id,
              is_available: db.is_available,
              name: db.course_name || row.name,
              credit_hours: db.credits ?? row.credit_hours,
            }
          : row;
      }),
    })),
  };
};

export type CurriculumSlotLookup = {
  key: string;
  label: string;
  sortOrder: number;
};

export const buildCurriculumSlotLookup = (
  curriculum: EeluCurriculum
): Map<string, CurriculumSlotLookup> => {
  const map = new Map<string, CurriculumSlotLookup>();
  for (const block of curriculum.blocks) {
    for (const course of block.courses) {
      map.set(course.code, {
        key: block.key,
        label: block.label,
        sortOrder: block.sortOrder,
      });
    }
  }
  return map;
};

export const getEeluCurriculumGroupedCourses = async () => {
  const curriculum = await loadEeluBylawCurriculum();
  return mergeCurriculumWithDb(curriculum);
};
