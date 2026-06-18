import { z } from "zod";

export const createUserSchema = z.object({
  first_name: z.string().min(1, "First name is required."),
  middle_name: z.string().min(1, "Middle name is required."),
  last_name: z.string().min(1, "Last name is required."),
  national_id: z
    .string()
    .min(1, "National ID is required.")
    .min(8, "National ID must be at least 8 characters."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  gender: z.enum(["male", "female"]),
  street_address: z.string().min(1, "Street address is required."),
});

export type CreateUserValues = z.infer<typeof createUserSchema>;
