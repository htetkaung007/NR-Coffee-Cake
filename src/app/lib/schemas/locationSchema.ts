import { z } from "zod";
import { idSchema } from "./common";

export const createLocationSchema = z.object({
  name: z.string().trim().min(1, "Location name is required.").max(120),
  /** ALL: every current menu shows there (stock 0). EMPTY: none yet. */
  startingMenus: z.enum(["ALL", "EMPTY"], "Choose the starting menus."),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = z.object({
  name: z.string().trim().min(1, "Location name is required.").max(120),
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

/** The owner's online-menu switch for one location. */
export const setOnlineMenuSchema = z.object({
  locationId: idSchema,
  enabled: z.boolean(),
});
