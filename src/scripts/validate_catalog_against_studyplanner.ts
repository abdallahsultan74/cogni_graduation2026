/**
 * Validate synced catalogs match StudyPlanner official source.
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

function extractCoursesBlock(html: string, varName: string): string {
  const startMarker = `const ${varName} = {`;
  const start = html.indexOf(startMarker);
  if (start === -1) throw new Error(`Missing ${varName}`);
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
      if (depth === 0) return html.slice(blockStart, i + 1);
    }
  }
  throw new Error(`Unclosed ${varName}`);
}

function parseRawCourses(objectLiteral: string): Record<string, RawCourse> {
  const fn = new Function(`return (${objectLiteral});`);
  return fn() as Record<string, RawCourse>;
}

type SyncCourse = {
  code: string;
  prerequisites: string[];
  Term: string[];
};

function compareTrack(
  track: "IT" | "AI",
  official: Record<string, RawCourse>,
  synced: SyncCourse[]
) {
  const errors: string[] = [];
  const syncedMap = new Map(synced.map((c) => [c.code, c]));

  for (const code of Object.keys(official)) {
    if (!isRealCatalogCourse(code)) continue;
    const row = syncedMap.get(code);
    if (!row) {
      errors.push(`[${track}] missing course ${code}`);
      continue;
    }
    const expectedTerm = official[code].semester % 2 === 1 ? "First" : "Second";
    if (!row.Term.includes(expectedTerm)) {
      errors.push(
        `[${track}] ${code} term expected ${expectedTerm}, got ${row.Term.join(",")}`
      );
    }
    const expectedPrereqs = [...official[code].prerequisites].sort().join(",");
    const actualPrereqs = [...row.prerequisites].sort().join(",");
    if (expectedPrereqs !== actualPrereqs) {
      errors.push(
        `[${track}] ${code} prereqs expected [${expectedPrereqs}] got [${actualPrereqs}]`
      );
    }
  }

  for (const code of syncedMap.keys()) {
    if (!official[code]) {
      errors.push(`[${track}] extra course in sync: ${code}`);
    }
  }

  return errors;
}

async function main() {
  const res = await fetch(STUDYPLANNER_URL);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  const html = await res.text();

  const itOfficial = parseRawCourses(extractCoursesBlock(html, "it_courses"));
  const aiOfficial = parseRawCourses(extractCoursesBlock(html, "ai_courses"));

  const itSynced = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "courses_it.json"), "utf-8")
  ) as SyncCourse[];
  const aiSynced = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, "courses_ai.json"), "utf-8")
  ) as SyncCourse[];

  const errors = [
    ...compareTrack("IT", itOfficial, itSynced),
    ...compareTrack("AI", aiOfficial, aiSynced),
  ];

  const itAi311 = itSynced.find((c) => c.code === "AI311");
  const aiAi311 = aiSynced.find((c) => c.code === "AI311");

  console.log(
    JSON.stringify(
      {
        itCourseCount: itSynced.length,
        aiCourseCount: aiSynced.length,
        itAi311Prereq: itAi311?.prerequisites,
        aiAi311Prereq: aiAi311?.prerequisites,
        errorCount: errors.length,
        errors: errors.slice(0, 20),
      },
      null,
      2
    )
  );

  if (errors.length > 0) {
    process.exit(1);
  }
  console.log("✅ Catalog validation passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
