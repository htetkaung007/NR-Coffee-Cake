import { z } from "zod";

/** A manager id from the Settings page. Which company it must belong to
 *  comes from the session — never from this input. */
const managerId = z.number().int().positive("Choose a manager.");

/** Removing a manager. */
export const removeManagerSchema = z.object({ managerId });

/** Moving a manager to another location of the owner's company. */
export const moveManagerSchema = z.object({
  managerId,
  locationId: z.number().int().positive("Choose a location."),
});
