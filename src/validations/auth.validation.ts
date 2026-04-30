import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Valid email is required"),
    password: z.string().min(6),
    role: z.enum(["STUDENT", "ADVISOR", "ADMIN"]).optional()
  })
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(6),
    newPassword: z.string().min(6)
  })
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    national_id: z.string().min(14),
    personal_email: z.string().email(),
    newPassword: z.string().min(6)
  })
});

export const forgotPasswordOtpRequestSchema = z.object({
  body: z.object({
    email: z.string().email()
  })
});

export const forgotPasswordOtpVerifySchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().min(4),
    newPassword: z.string().min(6)
  })
});