import prisma from "../config/prisma.js";
import { gradeToPoints } from "./gradeScale.js";

interface Enrollment {
  grade: string | null;
  course: {
    credits: number;
  };
}

export const calculateGPA = (enrollments: Enrollment[]): number => {
  let totalPoints = 0;
  let totalCredits = 0;

  for (const e of enrollments) {
    if (!e.grade) continue;
    const points = gradeToPoints(e.grade);
    if (points === 0 && e.grade.toUpperCase() !== "F") continue;

    totalPoints += points * e.course.credits;
    totalCredits += e.course.credits;
  }

  return totalCredits === 0 ? 0 : parseFloat((totalPoints / totalCredits).toFixed(2));
};

export const recalculateStudentGPA = async (studentId: number): Promise<number> => {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      student_id: studentId,
      grade: { not: null },
    },
    include: { course: true },
  });

  const gpa = calculateGPA(enrollments);

  await prisma.student.update({
    where: { student_id: studentId },
    data: { cumulative_gpa: gpa },
  });

  return gpa;
};

export const recalculateStudentEarnedHours = async (studentId: number): Promise<number> => {
  const passed = await prisma.enrollment.findMany({
    where: {
      student_id: studentId,
      grade: { not: null },
      NOT: { grade: "F" },
    },
    include: { course: true },
  });
  const hours = passed.reduce((sum, e) => sum + e.course.credits, 0);
  await prisma.student.update({
    where: { student_id: studentId },
    data: { total_earned_hours: hours },
  });
  return hours;
};
