import { z } from "zod";
import { PERMISSION_KEYS } from "@/app/lib/access/permissions";

/** The permissions an owner ticked: only catalog keys, at most one entry
 *  per catalog key's worth (duplicates are tolerated, then ignored by the
 *  service). */
export const permissionListSchema = z
  .array(z.enum(PERMISSION_KEYS, "Unknown permission."))
  .max(PERMISSION_KEYS.length, "Too many permissions.");

/** Saving one manager's access. The company and the owner come from the
 *  session — never from this input. */
export const setManagerPermissionsSchema = z.object({
  managerId: z.number().int().positive("Choose a manager."),
  permissions: permissionListSchema,
});

export type SetManagerPermissionsInput = z.infer<
  typeof setManagerPermissionsSchema
>;
