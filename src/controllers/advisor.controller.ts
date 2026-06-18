import type { Response } from "express";
import * as advisorService from "../services/advisor.service.js";
import * as studentService from "../services/student.service.js";

export const getMyProfileHandler = async (req: any, res: Response) => {
  const profile = await advisorService.getMyProfile(req.user.id);
  res.json(profile);
};

export const updateMyProfileHandler = async (req: any, res: Response) => {
  const updated = await advisorService.updateMyProfile(req.user.id, req.body);
  res.json(updated);
};

export const getMyStudentsHandler = async (req: any, res: Response) => {
  const search = req.query.search as string | undefined;
  const level = req.query.level != null ? Number(req.query.level) : undefined;
  const filters: { search?: string; level?: number } = {};
  if (search !== undefined) filters.search = search;
  if (level !== undefined) filters.level = level;
  const list = await advisorService.getMyStudents(
    req.user.id,
    Object.keys(filters).length > 0 ? filters : undefined
  );
  res.json(list);
};

export const getMyStudentByIdHandler = async (req: any, res: Response) => {
  const studentId = Number(req.params.studentId);
  const student = await advisorService.getMyStudentById(req.user.id, studentId);
  res.json(student);
};

export const getDashboardHandler = async (req: any, res: Response) => {
  const dashboard = await advisorService.getDashboard(req.user.id);
  res.json(dashboard);
};

export const getStudentTranscriptHandler = async (req: any, res: Response) => {
  const studentId = Number(req.params.studentId);
  await advisorService.getMyStudentById(req.user.id, studentId);
  const transcript = await studentService.getStudentTranscript(studentId);
  res.json(transcript);
};
