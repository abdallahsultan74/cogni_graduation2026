import type { Response } from "express";
import * as adminService from "../services/admin.service.js";
import { resolveSemesterForGrades } from "../services/enrollment.service.js";

export const getOverviewHandler = async (req: any, res: Response) => {
  const overview = await adminService.getOverview();
  const calendar = await adminService.getAcademicCalendar();
  res.json({ ...overview, academicCalendar: calendar });
};

export const getSystemSettingsHandler = async (_req: any, res: Response) => {
  const settings = await adminService.getSystemSettings();
  res.json(settings);
};

export const patchSystemSettingsHandler = async (req: any, res: Response) => {
  let patch: Record<string, unknown> = req.body ?? {};
  if (patch.key && patch.value && typeof patch.key === "string" && typeof patch.value === "object") {
    const k = patch.key as string;
    if (["general", "aiEngine", "permissions", "security"].includes(k)) {
      patch = { [k]: patch.value };
    }
  }
  const result = await adminService.patchSystemSettings(req.user.id, patch as any);
  res.json(result);
};

export const getAcademicCalendarHandler = async (_req: any, res: Response) => {
  const calendar = await adminService.getAcademicCalendar();
  res.json(calendar);
};

export const activateSemesterHandler = async (req: any, res: Response) => {
  const semesterId = Number(req.params.id);
  const result = await adminService.activateSemester(req.user.id, semesterId);
  res.json(result);
};

export const advanceSemesterHandler = async (req: any, res: Response) => {
  const result = await adminService.advanceSemester(req.user.id);
  res.json(result);
};

export const searchStudentsHandler = async (req: any, res: Response) => {
  const q = String(req.query.q ?? "");
  const students = await adminService.searchStudents(q);
  res.json(students);
};

export const getStudentEnrollmentsHandler = async (req: any, res: Response) => {
  const studentId = Number(req.params.id);
  const data = await adminService.getStudentEnrollmentsAdmin(studentId);
  res.json(data);
};

export const resolveSemesterHandler = async (req: any, res: Response) => {
  const semester_name = req.query.semester_name as string | undefined;
  const result_date = req.query.result_date as string | undefined;
  const resolved = await resolveSemesterForGrades(
    { semester_name, result_date },
    { createIfMissing: false }
  );
  res.json(resolved);
};
