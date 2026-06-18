import type { Request, Response } from "express";
import * as studentService from "../services/student.service.js";


export const getStudentHandler = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const student =
      await studentService.getStudentById(id);

    res.json(student);
};

export const updateStudentHandler = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const body = req.body as Parameters<typeof studentService.updateStudent>[1];

    const updated =
      await studentService.updateStudent(id, body);

    res.json(updated);
};

export const deactivateStudentHandler = async (req: Request,res: Response) => {
    const id = Number(req.params.id);

    const updated =
      await studentService.deactivateStudent(id);

    res.json(updated);
};

export const activateStudentHandler = async (req: Request, res: Response) => {
    const id = Number(req.params.id);

    const updated =
      await studentService.activateStudent(id);

    res.json(updated);
};

export const getMySummaryHandler = async (
  req: any,
  res: Response
) => {
    const summary =
      await studentService.getAcademicSummary(req.user.id);

    res.json(summary);
};

export const getMyProfileHandler = async (req: any, res: Response) => {
  const profile = await studentService.getMyProfile(req.user.id);
  res.json(profile);
};

export const updateMyProfileHandler = async (req: any, res: Response) => {
  const updated = await studentService.updateMyProfile(req.user.id, req.body);
  res.json(updated);
};

export const getMyTranscriptHandler = async (req: any, res: Response) => {
  const transcript = await studentService.getMyTranscript(req.user.id);
  res.json(transcript);
};