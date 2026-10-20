import { z } from "zod";
import {
  formIdSchema,
  idSchema,
  optionalIdListSchema,
  optionalTextSchema,
} from "./common";

/**
 * "Or Create Custom Add-On Option" group form — creates an AddonCategories
 * row (Group Title) together with one or more Addon rows (its options) in
 * a single submit. Addon categories and addons are managed together, not
 * as two separate flows. A blank price means Free: empty string is
 * coerced to 0 rather than failing validation.
 */
/** The longest group title / option name — ONE number per field pair,
 *  shared by the English field and its Myanmar twin, here and in the
 *  form's maxLength and counters. */
export const ADDON_GROUP_NAME_MAX = 50;
export const ADDON_OPTION_NAME_MAX = 120;

const priceOrBlankIsFree = z
  .union([z.literal(""), z.coerce.number().int().min(0)])
  .transform((value) => (value === "" ? 0 : value));

const optionSchema = z.object({
  name: z.string().trim().min(1, "Option name is required.").max(ADDON_OPTION_NAME_MAX),
  /** Shown to customers who choose Myanmar; null → the English name. */
  nameMy: optionalTextSchema(ADDON_OPTION_NAME_MAX),
  price: priceOrBlankIsFree,
});

export const createAddonGroupSchema = z.object({
  groupName: z.string().trim().min(1, "Group title is required.").max(ADDON_GROUP_NAME_MAX),
  /** Shown to customers who choose Myanmar; null → the English title. */
  groupNameMy: optionalTextSchema(ADDON_GROUP_NAME_MAX),
  isRequired: z.boolean(),
  options: z.array(optionSchema).min(1, "Add at least one option."),
  menuIds: optionalIdListSchema(),
});

export type CreateAddonGroupInput = z.infer<typeof createAddonGroupSchema>;

/**
 * Edit form for the same Group. Each option optionally carries the id of
 * the existing Addon row it maps to — present for options that already
 * existed, absent for new ones the user just added with "+ Add Option".
 * The Service uses that to decide update vs. create vs. archive.
 */
const editableOptionSchema = optionSchema.extend({
  id: formIdSchema.optional(),
});

export const updateAddonGroupSchema = z.object({
  groupName: z.string().trim().min(1, "Group title is required.").max(ADDON_GROUP_NAME_MAX),
  /** Shown to customers who choose Myanmar; null → the English title. */
  groupNameMy: optionalTextSchema(ADDON_GROUP_NAME_MAX),
  isRequired: z.boolean(),
  options: z.array(editableOptionSchema).min(1, "Add at least one option."),
  menuIds: optionalIdListSchema(),
});

export type UpdateAddonGroupInput = z.infer<typeof updateAddonGroupSchema>;

/** The Add-ons panel's on/off switch for one option. */
export const setAddonAvailableSchema = z.object({
  addonId: idSchema,
  isAvailable: z.boolean(),
});
export type SetAddonAvailableInput = z.infer<typeof setAddonAvailableSchema>;

/** The Add-ons panel's Required switch for a group. */
export const setAddonGroupRequiredSchema = z.object({
  addonCategoryId: idSchema,
  isRequired: z.boolean(),
});
export type SetAddonGroupRequiredInput = z.infer<
  typeof setAddonGroupRequiredSchema
>;
