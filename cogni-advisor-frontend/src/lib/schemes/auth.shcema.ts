import { z } from "zod";

export const loginSchema = z.object({
  identifier: z
    .string()
    .min(1, "Identifier is required")
    .min(6, "Identifier must be at least 6 characters"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

export type LoginValues = z.infer<typeof loginSchema>;
