import fs from "node:fs/promises";
import path from "node:path";

export type AiCourseCatalogCourse = {
  code: string;
  course_name: string;
  credit_hours: number;
  distribution_category: string;
  type: "Mandatory" | "Elective";
  prerequisites: string[];
  Term: Array<"First" | "Second" | "Summer">;
  department: "IT" | "AI" | "null";
  level?: string;
};

export type MajorTrack = "IT" | "AI";

const catalogCache = new Map<MajorTrack, Map<string, AiCourseCatalogCourse>>();

const resolveCatalogPath = (majorType: MajorTrack): string => {
  const base =
    process.env.COGNI_ADVISOR_AI_CATALOG_PATH ??
    path.resolve(process.cwd(), "cogni-advisor-ai/GP/recommendation/data");

  if (process.env.COGNI_ADVISOR_AI_CATALOG_PATH) {
    return process.env.COGNI_ADVISOR_AI_CATALOG_PATH;
  }

  const fileName =
    majorType === "AI" ? "courses_ai.json" : "courses_it.json";
  return path.join(base, fileName);
};

export const resolveMajorTrack = (
  majorType: string | null | undefined
): MajorTrack => {
  const v = (majorType ?? "IT").trim().toUpperCase();
  return v === "AI" ? "AI" : "IT";
};

export const getAiCourseCatalog = async (
  majorType?: string | null
): Promise<Map<string, AiCourseCatalogCourse>> => {
  const track = resolveMajorTrack(majorType);
  const cached = catalogCache.get(track);
  if (cached) return cached;

  const catalogPath = resolveCatalogPath(track);
  const raw = await fs.readFile(catalogPath, "utf-8");
  const json = JSON.parse(raw) as AiCourseCatalogCourse[];

  const map = new Map<string, AiCourseCatalogCourse>();
  for (const c of json) {
    map.set(c.code, c);
  }

  catalogCache.set(track, map);
  return map;
};

/** @deprecated Use getAiCourseCatalog(majorType) — loads union catalog */
export const getUnionCourseCatalog = async (): Promise<
  Map<string, AiCourseCatalogCourse>
> => {
  const unionPath =
    process.env.COGNI_ADVISOR_AI_CATALOG_PATH ??
    path.resolve(
      process.cwd(),
      "cogni-advisor-ai/GP/recommendation/data/courses.json"
    );

  const raw = await fs.readFile(unionPath, "utf-8");
  const json = JSON.parse(raw) as AiCourseCatalogCourse[];
  const map = new Map<string, AiCourseCatalogCourse>();
  for (const c of json) {
    map.set(c.code, c);
  }
  return map;
};

export const getYear1FirstSemesterCodes = async (
  majorType?: string | null
): Promise<string[]> => {
  const catalog = await getAiCourseCatalog(majorType);
  return [...catalog.values()]
    .filter(
      (c) =>
        c.level === "First Year" &&
        c.Term.includes("First") &&
        c.type === "Mandatory"
    )
    .map((c) => c.code)
    .sort((a, b) => a.localeCompare(b));
};
