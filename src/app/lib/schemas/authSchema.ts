import { z } from "zod";
import { permissionListSchema } from "./managerPermissionsSchema";

/** A name typed by a person: trimmed, and not empty once trimmed. Shared
 *  by every "name" field (a user's, a company's) so the rule lives once. */
export const requiredName = (message: string) =>
  z.string().trim().min(1, message);

export const registerSchema = z.object({
  name: requiredName("Name is required."),
  email: z.string().trim().email("A valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().email("A valid email is required."),
  password: z.string().min(1, "Password is required."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const createManagerSchema = z.object({
  email: z.string().trim().email("A valid email is required."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  locationId: z.coerce.number().int().positive("Select a location."),
  /** Missing → the catalog's defaults (ManagerService.createManagerForLocation). */
  permissions: permissionListSchema.optional(),
});

export type CreateManagerInput = z.infer<typeof createManagerSchema>;
