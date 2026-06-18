import prisma from "../config/prisma.js";

const ACADEMIC_CALENDAR_KEY = "academicCalendar";

const getPlanningSemesterIdFromSettings = async (): Promise<number | null> => {
  const row = await prisma.systemSetting.findUnique({
    where: { key: ACADEMIC_CALENDAR_KEY },
  });
  if (!row?.value || typeof row.value !== "object") return null;
  const v = row.value as { planningSemesterId?: number | null };
  return v.planningSemesterId ?? null;
};

const latestFallSemesterName = async (): Promise<string | null> => {
  const fall = await prisma.semester.findFirst({
    where: { semester_name: { contains: "Fall", mode: "insensitive" } },
    orderBy: { start_date: "desc" },
    select: { semester_name: true },
  });
  return fall?.semester_name ?? null;
};

/** Semester name used when generating a study plan (not necessarily the latest DB row). */
export const resolvePlanningSemesterName = async (
  studentId: number
): Promise<string | null> => {
  const settingsId = await getPlanningSemesterIdFromSettings();
  if (settingsId) {
    const sem = await prisma.semester.findUnique({
      where: { semester_id: settingsId },
      select: { semester_name: true },
    });
    if (sem?.semester_name) return sem.semester_name;
  }

  const enrollmentCount = await prisma.enrollment.count({
    where: { student_id: studentId },
  });

  if (enrollmentCount === 0) {
    return latestFallSemesterName();
  }

  const latestEnrollment = await prisma.enrollment.findFirst({
    where: { student_id: studentId, semester_id: { not: null } },
    orderBy: { semester: { start_date: "desc" } },
    select: {
      semester: {
        select: { semester_name: true, start_date: true },
      },
    },
  });

  const latestStart = latestEnrollment?.semester?.start_date;
  if (!latestStart) {
    return latestFallSemesterName();
  }

  const laterSemesters = await prisma.semester.findMany({
    where: { start_date: { gt: latestStart } },
    orderBy: { start_date: "asc" },
    select: { semester_name: true },
  });

  const nextRegular = laterSemesters.find(
    (s) => !s.semester_name?.toLowerCase().includes("summer")
  );
  if (nextRegular?.semester_name) {
    return nextRegular.semester_name;
  }

  return latestFallSemesterName();
};

/** DB semester row the generated plan should be stored under. */
export const resolvePlanningSemesterId = async (
  studentId: number
): Promise<number | null> => {
  const settingsId = await getPlanningSemesterIdFromSettings();
  if (settingsId) return settingsId;

  const semesterName = await resolvePlanningSemesterName(studentId);
  if (!semesterName) return null;

  const semester = await prisma.semester.findFirst({
    where: { semester_name: semesterName },
    select: { semester_id: true },
  });
  return semester?.semester_id ?? null;
};

export const getCurrentSemesterIdFromSettings = async (): Promise<number | null> => {
  const row = await prisma.systemSetting.findUnique({
    where: { key: ACADEMIC_CALENDAR_KEY },
  });
  if (!row?.value || typeof row.value !== "object") return null;
  const v = row.value as { currentSemesterId?: number | null };
  return v.currentSemesterId ?? null;
};
