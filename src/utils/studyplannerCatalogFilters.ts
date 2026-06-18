/**
 * StudyPlanner (GitHub) includes demo placeholder codes not in the official bylaw PDF.
 * Exclude them from Cogni-Advisor catalogs and DB.
 */
export const EXCLUDED_STUDYPLANNER_CODES = new Set([
  "LB496", // Advanced Machine Learning lab — not in official materials
  "LB497", // AI Cloud Services lab — same
]);

/** True if course should appear in Cogni-Advisor catalogs. */
export function isRealCatalogCourse(code: string): boolean {
  if (EXCLUDED_STUDYPLANNER_CODES.has(code)) return false;
  // Elective placeholders: AI41X, AI4X1, AI43X, AI46X, AI48X
  if (/X/i.test(code)) return false;
  return true;
}
