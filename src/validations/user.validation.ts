import { z } from "zod";

const createUserBodyBase = z.object({
  first_name: z.string().min(2),
  middle_name: z.string().optional(),
  last_name: z.string().min(2),
  national_id: z.string().min(14),
  password: z.string().min(6),
  gender: z.string().optional(),
  street_address: z.string().optional()
});

export const createUserSchema = z.object({
  body: createUserBodyBase.extend({
    role: z.enum(["STUDENT", "ADVISOR", "ADMIN"])
  })
});

export const createStudentByAdminSchema = z.object({
  body: createUserBodyBase.extend({
    personal_email: z.string().email("Valid personal email is required")
  })
});

export const createAdvisorByAdminSchema = z.object({
  body: createUserBodyBase
});

export const createAdminByAdminSchema = z.object({
  body: createUserBodyBase
});

export const updateUserSchema = z.object({
  body: z.object({
    first_name: z.string().min(2).optional(),
    last_name: z.string().min(2).optional(),
    personal_email: z.string().email().optional(),
    gender: z.string().optional(),
    street_address: z.string().optional()
  })
});

export const deleteUserSchema = z.object({
  params: z.object({
    id: z.string().regex(/^\d+$/, "id must be a numeric string")
  })
});