import type { Response } from "express";
import * as authService from "../services/auth.service.js";
import * as userService from "../services/user.service.js";

export const registerStudentHandler = async (req: any, res: Response) => {
  const user = await userService.createUser({
    ...req.body,
    role: "STUDENT"
  });
  const { password_hash: _pw, ...safe } = user;
  res.status(201).json(safe);
};

export const loginHandler = async (req: any, res: Response) => {
  const { identifier, password, role: requestedRole } = req.body;

  const result = await authService.login(
    identifier,
    password,
    requestedRole
  );

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