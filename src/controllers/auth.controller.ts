import type { Response } from "express";
import * as authService from "../services/auth.service.js";
import { AppError } from "../utils/AppError.js";

export const registerStudentHandler = async (req: any, res: Response) => {
  throw new AppError(
    "Public registration is disabled. Please contact an admin to create your account.",
    403
  );
};

export const loginHandler = async (req: any, res: Response) => {
  const { email, password, role: requestedRole } = req.body;

  const result = await authService.login(
    email,
    password,
    requestedRole
  );

  res.json(result);
};

export const loginStudentHandler = async (req: any, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, "STUDENT");
  res.json(result);
};

export const loginAdvisorHandler = async (req: any, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, "ADVISOR");
  res.json(result);
};

export const loginAdminHandler = async (req: any, res: Response) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, "ADMIN");
  res.json(result);
};

export const meHandler = async (req: any, res: Response) => {
  res.json({
    id: req.user.id,
    role: req.user.role
  });
};

export const changePasswordHandler = async (
  req: any,
  res: Response
) => {

  const { currentPassword, newPassword } = req.body;

  const result = await authService.changePassword(
    req.user.id,
    currentPassword,
    newPassword
  );

  res.json(result);
};

export const forgotPasswordHandler = async (req: any, res: Response) => {
  const { national_id, personal_email, newPassword } = req.body;

  const result = await authService.forgotPasswordForStudent(
    national_id,
    personal_email,
    newPassword
  );

  res.json(result);
};

export const requestForgotPasswordOtpHandler = async (req: any, res: Response) => {
  const { email } = req.body;
  const result = await authService.requestForgotPasswordOtp(email);
  res.json(result);
};

export const verifyForgotPasswordOtpHandler = async (req: any, res: Response) => {
  const { email, otp, newPassword } = req.body;
  const result = await authService.verifyForgotPasswordOtp(email, otp, newPassword);
  res.json(result);
};