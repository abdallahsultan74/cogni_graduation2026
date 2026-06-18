/**
 * Sync course catalogs from EELU StudyPlanner (official source).
 * https://eelu-training-unit.github.io/StudyPlanner/courses
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isRealCatalogCourse } from "../utils/studyplannerCatalogFilters.js";

const STUDYPLANNER_URL =
  "https://raw.githubusercontent.com/eelu-training-unit/StudyPlanner/main/courses.html";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(
  __dirname,
  "../../cogni-advisor-ai/GP/recommendation/data"
);

type RawCourse = {
  name: string;
  semester: number;
  prerequisites: string[];
  hours: number;
};

type CatalogCourse = {
  code: string;
  course_name: string;
  credit_hours: number;
  distribution_category: string;
  type: "Mandatory" | "Elective";
  prerequisites: string[];
  Term: ("First" | "Second" | "Summer")[];
  department: "IT" | "AI" | "null";
  level: string;
  track: "IT" | "AI";
};

const GENERAL_MANDATORY = new Set(["HU111", "HU112", "HU113", "HU413"]);
const GENERAL_ELECTIVE = new Set([
  "HU101",
  "HU102",
  "HU201",
  "HU124",
  "HU125",
  "HU115",
  "HU128",
  "HU402",
  "HU427",
]);

const MATH_BASIC = new Set([
  "MA111",
  "MA112",
  "MA113",
  "MA214",
  "ST121",
  "ST222",
  "IT111",
  "IT113",
]);

const BASIC_CS_IT = new Set([
  "IT110",
  "CS112",
  "CS215",
  "CS216",
  "CS240",
  "IT217",
  "DS211",
  "IT230",
  "IT231",
  "CS318",
  "CS341",
  "CS319",
  "AI311",
]);

const BASIC_CS_AI = new Set([
  "IT110",
  "IT114",
  "IT215",
  "IT216",
  "CS240",
  "IT217",
  "DS211",
  "IT230",
  "IT231",
  "IT318",
  "IT341",
  "CS319",
  "AI311",
]);

const AI_ELECTIVE_PLACEHOLDERS = /^AI\d+X$/i;

function semesterToTerm(semester: number): "First" | "Second" {
  return semester % 2 === 1 ? "First" : "Second";
}

function semesterToLevel(semester: number): string {
  const year = Math.ceil(semester / 2);
  const labels = ["First Year", "Second Year", "Third Year", "Fourth Year"];
  return labels[year - 1] ?? "Fourth Year";
}

function inferDistribution(
  code: string,
  level: string,
  track: "IT" | "AI"
): string {
  const prefix = code.slice(0, 2);
  if (prefix === "HU") return "General_Requirements";
  if (MATH_BASIC.has(code) || prefix === "MA" || prefix === "ST") {
    return "Math_And_Basic_Sciences";
  }
  if (prefix === "LB") return "Specialized_Labs";
  if (prefix === "PC") return "Graduation_Project";
  if (prefix === "TR") return "Training_Field";
  const basic = track === "IT" ? BASIC_CS_IT : BASIC_CS_AI;
  if (basic.has(code)) return "Basic_Computer_Science";
  return "Applied_Sciences";
}

function inferType(
  code: string,
  distribution: string,
  level: string
): "Mandatory" | "Elective" {
  if (
    distribution === "Specialized_Labs" ||
    distribution === "Graduation_Project" ||
    distribution === "Training_Field"
  ) {
    return "Mandatory";
  }
  if (distribution === "General_Requirements") {
    if (GENERAL_MANDATORY.has(code)) return "Mandatory";
    if (GENERAL_ELECTIVE.has(code)) return "Elective";
  }
  if (AI_ELECTIVE_PLACEHOLDERS.test(code)) return "Elective";
  if (distribution === "Applied_Sciences" && level.startsWith("Fourth Year")) {
    return "Elective";
  }
  return "Mandatory";
}

function inferDepartment(
  code: string,
  distribution: string
): "IT" | "AI" | "null" {
  if (
    distribution === "Applied_Sciences" ||
    distribution === "Graduation_Project"
  ) {
    return code.startsWith("AI") ? "AI" : "IT";
  }
  return "null";
}

function extractCoursesBlock(html: string, varName: string): string {
  const startMarker = `const ${varName} = {`;
  const start = html.indexOf(startMarker);
  if (start === -1) {
    throw new Error(`Could not find ${varName} in StudyPlanner HTML`);
  }
  let depth = 0;
  let inString: "'" | '"' | null = null;
  let escaped = false;
  const blockStart = start + startMarker.length - 1;
  for (let i = blockStart; i < html.length; i++) {
    const ch = html[i];
    if (inString) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === inString) inString = null;
      continue;
    }
    if (ch === "'" || ch === '"') {
      inString = ch;
      continue;
    }
    if (ch === "{") depth++;
    if (ch === "}") {
      depth--;
      if (depth === 0) {
        return html.slice(blockStart, i + 1);
      }
    }
  }
  throw new Error(`Unclosed object for ${varName}`);
}

function parseRawCourses(objectLiteral: string): Record<string, RawCourse> {
  const fn = new Function(`return (${objectLiteral});`);
  return fn() as Record<string, RawCourse>;
}

function toCatalogCourse(
  code: string,
  raw: RawCourse,
  track: "IT" | "AI"
): CatalogCourse {
  const level = semesterToLevel(raw.semester);
  const distribution = inferDistribution(code, level, track);
  const type = inferType(code, distribution, level);
  return {
    code,
    course_name: raw.name.trim(),
    credit_hours: raw.hours,
    distribution_category: distribution,
    type,
    prerequisites: [...raw.prerequisites],
    Term: [semesterToTerm(raw.semester)],
    department: inferDepartment(code, distribution),
    level,
    track,
  };
}

function buildPrerequisiteGraph(courses: CatalogCourse[]) {
  const prerequisites: Record<string, string[]> = {};
  const dependents: Record<string, string[]> = {};
  for (const course of courses) {
    prerequisites[course.code] = [...course.prerequisites];
    for (const prereq of course.prerequisites) {
      if (prereq.startsWith("Passing")) continue;
      if (!dependents[prereq]) dependents[prereq] = [];
      dependents[prereq].push(course.code);
    }
  }
  for (const key of Object.keys(dependents)) {
    dependents[key].sort();
  }
  return { prerequisites, dependents };
}

function stripTrackField(courses: CatalogCourse[]) {
  return courses.map(({ track: _track, ...rest }) => rest);
}

async function fetchHtml(): Promise<string> {
  const res = await fetch(STUDYPLANNER_URL);
  if (!res.ok) {
    throw new Error(`Failed to fetch StudyPlanner HTML: ${res.status}`);
  }
  return res.text();
}

async function main() {
  console.log("Fetching StudyPlanner courses.html...");
  const html = await fs.existsSync(
    path.resolve(__dirname, "../../cogni-advisor-ai/GP/courses.html")
  )
    ? fs.readFileSync(
        path.resolve(__dirname, "../../cogni-advisor-ai/GP/courses.html"),
        "utf-8"
      )
    : await fetchHtml();

  const aiRaw = parseRawCourses(extractCoursesBlock(html, "ai_courses"));
  const itRaw = parseRawCourses(extractCoursesBlock(html, "it_courses"));

  const aiCourses = Object.entries(aiRaw)
    .filter(([code]) => isRealCatalogCourse(code))
    .map(([code, raw]) => toCatalogCourse(code, raw, "AI"))
    .sort((a, b) => a.code.localeCompare(b.code));

  const itCourses = Object.entries(itRaw)
    .filter(([code]) => isRealCatalogCourse(code))
    .map(([code, raw]) => toCatalogCourse(code, raw, "IT"))
    .sort((a, b) => a.code.localeCompare(b.code));

  const excluded = [
    ...Object.keys(aiRaw).filter((c) => !isRealCatalogCourse(c)),
    ...Object.keys(itRaw).filter((c) => !isRealCatalogCourse(c)),
  ];
  const uniqueExcluded = [...new Set(excluded)];
  if (uniqueExcluded.length > 0) {
    console.log(`Excluded ${uniqueExcluded.length} placeholder codes: ${uniqueExcluded.join(", ")}`);
  }

  const aiGraph = buildPrerequisiteGraph(aiCourses);
  const itGraph = buildPrerequisiteGraph(itCourses);

  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(
    path.join(DATA_DIR, "courses_ai.json"),
    JSON.stringify(stripTrackField(aiCourses), null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "courses_it.json"),
    JSON.stringify(stripTrackField(itCourses), null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "prerequisite_graph_ai.json"),
    JSON.stringify(aiGraph, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "prerequisite_graph_it.json"),
    JSON.stringify(itGraph, null, 2),
    "utf-8"
  );

  // Union catalog for legacy fallback (all unique codes from both tracks)
  const unionMap = new Map<string, Omit<CatalogCourse, "track">>();
  for (const c of [...itCourses, ...aiCourses]) {
    const { track: _t, ...rest } = c;
    if (!unionMap.has(c.code)) unionMap.set(c.code, rest);
  }
  const unionCourses = [...unionMap.values()].sort((a, b) =>
    a.code.localeCompare(b.code)
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "courses.json"),
    JSON.stringify(unionCourses, null, 2),
    "utf-8"
  );
  fs.writeFileSync(
    path.join(DATA_DIR, "prerequisite_graph.json"),
    JSON.stringify(buildPrerequisiteGraph(unionCourses as CatalogCourse[]), null, 2),
    "utf-8"
  );

  console.log(`✅ AI track: ${aiCourses.length} courses`);
  console.log(`✅ IT track: ${itCourses.length} courses`);
  console.log(`✅ Union (legacy courses.json): ${unionCourses.length} courses`);
  console.log(`   AI311 prereq IT: ${itGraph.prerequisites.AI311?.join(", ")}`);
  console.log(`   AI311 prereq AI: ${aiGraph.prerequisites.AI311?.join(", ")}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
