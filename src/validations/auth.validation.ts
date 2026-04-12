import { z } from "zod";

export const loginSchema = z.object({
  body: z.object({
    identifier: z.string().min(14, "Invalid national ID"),
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

/** تسجيل طالب جديد (عام — بدون توكن أدمن) */
export const registerStudentSchema = z.object({
  body: z.object({
    first_name: z.string().min(2),
    middle_name: z.string().optional(),
    last_name: z.string().min(2),
    national_id: z.string().min(14),
    personal_email: z.string().email(),
    password: z.string().min(6),
    gender: z.string().optional(),
    street_address: z.string().optional()
  })
});