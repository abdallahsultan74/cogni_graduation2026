import type { Request, Response } from "express";
import * as enrollmentService from "../services/enrollment.service.js";

export const enrollHandler = async (req: Request, res: Response) => {
  const course_id = req.body.course_id as number;
  const studentId = (req as any).user?.id;
  if (!studentId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const enrollment = await enrollmentService.enrollStudent(studentId, course_id);
  res.status(201).json(enrollment);
};

export const markPassedHandler = async (req: Request, res: Response) => {
  const { student_id, course_id, grade, semester_id, semester_name, result_date } = req.body;

  const resolvedSemesterId = await enrollmentService.resolveOptionalSemesterForGrades({
    semester_id,
    semester_name,
    result_date,
  });

  const result = await enrollmentService.markCoursePassed(
    student_id,
    course_id,
    grade,
    resolvedSemesterId
  );

  res.json(result);
};

export const bulkGradesHandler = async (req: Request, res: Response) => {
  const { semester_id, semester_name, result_date, grades } = req.body;
  const result = await enrollmentService.bulkUploadGrades(
    { semester_id, semester_name, result_date },
    grades
  );
  res.json(result);
};
