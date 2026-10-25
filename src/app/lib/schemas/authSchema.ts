import { z } from "zod";
import { permissionListSchema } from "./managerPermissionsSchema";

/** A name typed by a person: trimmed, and not empty once trimmed. Shared
 *  by every "name" field (a user's, a company's) so the rule lives once. */
export const requiredName = (message: string) =>
  z.string().trim().min(1, message);

/** bcrypt only uses a password's first 72 BYTES — anything after them
 *  would be silently ignored, so a new password may not be longer. */
const PASSWORD_MAX_BYTES = 72;

/** A password being SET (sign-up, a new manager): 8 to 72 characters,
 *  and at most 72 bytes in UTF-8 (Myanmar letters take 3 bytes each). */
export const newPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(PASSWORD_MAX_BYTES, "Password must be at most 72 characters.")
  .refine(
    (password) =>
      new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES,
    "Password is too long — use fewer or simpler characters (at most 72 bytes).",
  );

export const registerSchema = z.object({
  name: requiredName("Name is required."),
  email: z.string().trim().email("A valid email is required."),
  password: newPasswordSchema,
});

/** Sign-in checks only that a password was typed — no upper limit here, so
 *  an account set up before the 72-byte rule can still sign in (bcrypt
 *  compares its first 72 bytes either way). */
export const loginSchema = z.object({
  email: z.string().trim().email("A valid email is required."),
  password: z.string().min(1, "Password is required."),
});

export const createManagerSchema = z.object({
  email: z.string().trim().email("A valid email is required."),
  password: newPasswordSchema,
  locationId: z.coerce.number().int().positive("Select a location."),
  /** Missing → the catalog's defaults (ManagerService.createManagerForLocation). */
  permissions: permissionListSchema.optional(),
});

export type CreateManagerInput = z.infer<typeof createManagerSchema>;
