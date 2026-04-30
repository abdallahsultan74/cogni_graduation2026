import type { Semester } from "@prisma/client";

export const mapSemesterToCogniAdvisorTerm = (
  semesterName: string | null | undefined
): { Term: "First" | "Second" | "Summer"; semester: "regular" | "summer" } => {
  const v = (semesterName ?? "").trim().toLowerCase();

  // Summer semester
  if (v.includes("summer")) {
    return { Term: "Summer", semester: "summer" };
  }

  // Spring/Fall mappings (common conventions)
  const isFirst =
    v.includes("first") ||
    v.includes("fall") ||
    v.includes("autumn") ||
    v.includes("semester 1") ||
    v.includes("semester1");

  if (isFirst) {
    return { Term: "First", semester: "regular" };
  }

  const isSecond =
    v.includes("second") ||
    v.includes("spring") ||
    v.includes("semester 2") ||
    v.includes("semester2");

  if (isSecond) {
    return { Term: "Second", semester: "regular" };
  }

  // Fallback default
  return { Term: "First", semester: "regular" };
};

