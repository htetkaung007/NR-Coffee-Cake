import { z } from "zod";

export const createLocationSchema = z.object({
  name: z.string().trim().min(1, "Location name is required.").max(120),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

export const updateLocationSchema = z.object({
  name: z.string().trim().min(1, "Location name is required.").max(120),
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
