import prisma from "../config/prisma.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { AppError } from "../utils/AppError.js";
import { logger } from "../config/logger.js";
import { createClient } from "@supabase/supabase-js";

const LOGIN_ERROR_MESSAGE = "Invalid credentials or account not found";

const getSupabaseOtpClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey)
    throw new AppError("Supabase OTP is not configured", 500);

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
};

export const login = async (
  email: string,
  password: string,
  requestedRole?: string
) => {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { personal_email: normalizedEmail }
  });

  if (!user)
  {
    logger.warn("Login failed: account not found", { email: normalizedEmail });
    throw new AppError(LOGIN_ERROR_MESSAGE, 401);
  }

  const isMatch = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!isMatch)
  {
    logger.warn("Login failed: wrong password", { userId: user.user_id });
    throw new AppError(LOGIN_ERROR_MESSAGE, 401);
  }

  if (requestedRole && requestedRole !== user.role)
  {
    logger.warn("Login failed: role mismatch", {
      userId: user.user_id,
      requestedRole,
      actualRole: user.role
    });
    throw new AppError(LOGIN_ERROR_MESSAGE, 401);
  }

  const secret = process.env.JWT_SECRET ?? "fallback-secret-change-in-production";
  const token = jwt.sign(
    {
      id: user.user_id,
      role: user.role
    },
    secret,
    { expiresIn: "1d" }
  );

  return {
    token,
    user: {
      id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role
    }
  };
};

export const changePassword = async (
  userId: number,
  currentPassword: string,
  newPassword: string
) => {

  const user = await prisma.user.findUnique({
    where: { user_id: userId }
  });

  if (!user)
    throw new AppError("User not found", 404);

  const isMatch = await bcrypt.compare(
    currentPassword,
    user.password_hash
  );

  if (!isMatch)
    throw new AppError("Incorrect current password", 400);

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { user_id: userId },
    data: {
      password_hash: hashedPassword
    }
  });

  return { message: "Password updated successfully" };
};

export const forgotPasswordForStudent = async (
  nationalId: string,
  personalEmail: string,
  newPassword: string
) => {
  const user = await prisma.user.findUnique({
    where: { national_id: nationalId }
  });

  if (!user || user.role !== "STUDENT")
  {
    logger.warn("Forgot password failed: student not found", { nationalId });
    throw new AppError("Student account not found", 404);
  }

  if (user.personal_email.toLowerCase() !== personalEmail.toLowerCase())
  {
    logger.warn("Forgot password failed: national ID/email mismatch", {
      userId: user.user_id
    });
    throw new AppError("National ID and email do not match", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { password_hash: hashedPassword }
  });

  logger.info("Student password reset completed", { userId: user.user_id });

  return { message: "Password reset successfully" };
};

export const requestForgotPasswordOtp = async (email: string) => {
  const normalizedEmail = email.toLowerCase();

  const user = await prisma.user.findUnique({
    where: { personal_email: normalizedEmail },
    select: { user_id: true }
  });

  if (!user)
    throw new AppError("Account not found", 404);

  const supabase = getSupabaseOtpClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      shouldCreateUser: false
    }
  });

  if (error) {
    logger.warn("Supabase OTP request failed", { email: normalizedEmail, error: error.message });
    throw new AppError("Failed to send OTP", 400);
  }

  return { message: "OTP sent to email" };
};

export const verifyForgotPasswordOtp = async (
  email: string,
  otp: string,
  newPassword: string
) => {
  const normalizedEmail = email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { personal_email: normalizedEmail }
  });

  if (!user)
    throw new AppError("Account not found", 404);

  const supabase = getSupabaseOtpClient();
  const { error } = await supabase.auth.verifyOtp({
    email: normalizedEmail,
    token: otp,
    type: "email"
  });

  if (error) {
    logger.warn("Supabase OTP verify failed", { email: normalizedEmail, error: error.message });
    throw new AppError("Invalid or expired OTP", 400);
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { user_id: user.user_id },
    data: { password_hash: hashedPassword }
  });

  return { message: "Password reset successfully" };
};