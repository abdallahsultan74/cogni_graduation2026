import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";
import { AppError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const authenticateMiddleware = async (req: any, res: any, next: any) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer "))
    throw new AppError("Unauthorized", 401);

  const token = authHeader.split(" ")[1];
  const secret = process.env.JWT_SECRET ?? "fallback-secret-change-in-production";
  let decoded: any;

  try {
    decoded = jwt.verify(token, secret);
  } catch {
    throw new AppError("Unauthorized", 401);
  }

  const user = await prisma.user.findUnique({
    where: { user_id: decoded.id }
  });

  if (!user)
    throw new AppError("User not found", 404);

  req.user = {
    id: user.user_id,
    role: user.role
  };

  next();
};

export const authenticate = asyncHandler(authenticateMiddleware);