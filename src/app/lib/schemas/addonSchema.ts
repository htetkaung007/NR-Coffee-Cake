import { z } from "zod";

/**
 * "Or Create Custom Add-On Option" group form — creates an AddonCategories
 * row (Group Title) together with one or more Addon rows (its options) in
 * a single submit. Addon categories and addons are managed together, not
 * as two separate flows. A blank price means Free: empty string is
 * coerced to 0 rather than failing validation.
 */
const priceOrBlankIsFree = z
  .union([z.literal(""), z.coerce.number().int().min(0)])
  .transform((value) => (value === "" ? 0 : value));

const optionSchema = z.object({
  name: z.string().trim().min(1, "Option name is required.").max(120),
  price: priceOrBlankIsFree,
});

export const createAddonGroupSchema = z.object({
  groupName: z.string().trim().min(1, "Group title is required.").max(50),
  isRequired: z.boolean(),
  options: z.array(optionSchema).min(1, "Add at least one option."),
  menuIds: z
    .array(z.coerce.number().int().positive())
    .optional()
    .transform((ids) => [...new Set(ids ?? [])]),
});

export type CreateAddonGroupInput = z.infer<typeof createAddonGroupSchema>;

/**
 * Edit form for the same Group. Each option optionally carries the id of
 * the existing Addon row it maps to — present for options that already
 * existed, absent for new ones the user just added with "+ Add Option".
 * The Service uses that to decide update vs. create vs. archive.
 */
const editableOptionSchema = optionSchema.extend({
  id: z.coerce.number().int().positive().optional(),
});

export const updateAddonGroupSchema = z.object({
  groupName: z.string().trim().min(1, "Group title is required.").max(50),
  isRequired: z.boolean(),
  options: z.array(editableOptionSchema).min(1, "Add at least one option."),
  menuIds: z
    .array(z.coerce.number().int().positive())
    .optional()
    .transform((ids) => [...new Set(ids ?? [])]),
});

export type UpdateAddonGroupInput = z.infer<typeof updateAddonGroupSchema>;
