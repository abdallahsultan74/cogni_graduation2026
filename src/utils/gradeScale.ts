export const GRADE_POINTS: Record<string, number> = {
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

export const gradeToPoints = (grade: string | null | undefined): number => {
  if (!grade) return 0;
  return GRADE_POINTS[grade.trim().toUpperCase()] ?? 0;
};

export const computeSemesterGpa = (
  courses: Array<{ credits: number; grade: string | null | undefined }>
): number => {
  let weighted = 0;
  let gradedHours = 0;
  for (const c of courses) {
    if (!c.grade) continue;
    weighted += gradeToPoints(c.grade) * c.credits;
    gradedHours += c.credits;
  }
  if (gradedHours === 0) return 0;
  return Number((weighted / gradedHours).toFixed(2));
};
