import type { Response } from "express";
import * as userService from "../services/user.service.js";

export const createUserHandler = async (req: any, res: Response) => {

  const user = await userService.createUser(req.body);

  res.status(201).json(user);
};

export const createStudentByAdminHandler = async (req: any, res: Response) => {
  const user = await userService.createUser({
    ...req.body,
    role: "STUDENT"
  });
  res.status(201).json(user);
};

export const createAdvisorByAdminHandler = async (req: any, res: Response) => {
  const user = await userService.createUser({
    ...req.body,
    role: "ADVISOR"
  });
  res.status(201).json(user);
};

export const createAdminByAdminHandler = async (req: any, res: Response) => {
  const user = await userService.createUser({
    ...req.body,
    role: "ADMIN"
  });
  res.status(201).json(user);
};

export const getUsersHandler = async (req: any, res: Response) => {

  const users = await userService.getAllUsers();

  res.json(users);
};

export const getUserHandler = async (req: any, res: Response) => {

  const user = await userService.getUserById(
    Number(req.params.id)
  );

  res.json(user);
};

export const updateUserHandler = async (req: any, res: Response) => {

  const user = await userService.updateUser(
    Number(req.params.id),
    req.body
  );

  res.json(user);
};

export const deleteUserHandler = async (req: any, res: Response) => {
  await userService.deleteUser(
    Number(req.params.id),
    req.user?.id
  );
  res.status(204).send();
};