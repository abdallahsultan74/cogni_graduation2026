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

let cachedCatalog: Map<string, AiCourseCatalogCourse> | null = null;

export const getAiCourseCatalog = async (): Promise<Map<string, AiCourseCatalogCourse>> => {
  if (cachedCatalog) return cachedCatalog;

  const catalogPath =
    process.env.COGNI_ADVISOR_AI_CATALOG_PATH ??
    path.resolve(process.cwd(), "cogni-advisor-ai/GP/recommendation/data/courses.json");

  const raw = await fs.readFile(catalogPath, "utf-8");
  const json = JSON.parse(raw) as AiCourseCatalogCourse[];

  const map = new Map<string, AiCourseCatalogCourse>();
  for (const c of json) {
    map.set(c.code, c);
  }

  cachedCatalog = map;
  return map;
};

