import { z } from "zod";
import { CURRENCY_LABEL } from "@/app/lib/orderFormat";
import { NO_LOCATION_MESSAGE } from "@/app/lib/menuLocations";

/** Most locations one company can tick on a menu form. */
const MAX_SHOWN_LOCATIONS = 50;

export const createMenuSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Menu item name is required.")
    .max(50, "Menu item name cannot exceed 50 characters."),
  description: z
    .string()
    .trim()
    .max(100, "Description cannot exceed 100 characters."),
  price: z.coerce
    .number()
    .int(`Price must be a whole number of ${CURRENCY_LABEL}.`)
    .positive("Price must be greater than zero."),
  quantity: z.coerce
    .number()
    .int("Stock quantity must be a whole number.")
    .min(0, "Stock quantity cannot be negative."),
  isAvailable: z.boolean(),
  categoryIds: z
    .array(z.coerce.number().int().positive())
    .min(1, "Select at least one menu category.")
    .transform((ids) => [...new Set(ids)]),
  addonCategoryIds: z
    .array(z.coerce.number().int().positive())
    .optional()
    .transform((ids) => [...new Set(ids ?? [])]),
  /** Where the menu shows — company/active-location membership is
   *  checked by MenuLocationService.setMenuLocations. */
  shownLocationIds: z
    .array(z.coerce.number().int().positive())
    .min(1, NO_LOCATION_MESSAGE)
    .max(MAX_SHOWN_LOCATIONS)
    .transform((ids) => [...new Set(ids)]),
  image: z
    .custom<File | null>((value) => value === null || value instanceof File, {
      message: "Image upload is invalid.",
    })
    .refine(
      (file) => file === null || file.size <= 5 * 1024 * 1024,
      "Image must be 5MB or smaller.",
    )
    .refine(
      (file) =>
        file === null ||
        ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "Image must be a PNG, JPEG, or WEBP file.",
    ),
});

export type CreateMenuInput = z.infer<typeof createMenuSchema>;

/** The menu card's on/off switch at the selected location. The location
 *  is never part of the input — it comes from the session. */
export const setMenuAvailableSchema = z.object({
  menuId: z.number().int().positive(),
  isAvailable: z.boolean(),
});
export type SetMenuAvailableInput = z.infer<typeof setMenuAvailableSchema>;

export const createMenuCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(50),
  isEnabled: z.boolean(),
});

export type CreateMenuCategoryInput = z.infer<typeof createMenuCategorySchema>;

/** Same name/switch rules as create (one name rule — the dialogs'
 *  MenuCategoryFields validates with it too), plus the staged removals. */
export const updateMenuCategorySchema = createMenuCategorySchema.extend({
  /** Menus staged for removal from this category in the Edit dialog —
   *  applied with the rename/enable in one transaction. */
  removeMenuIds: z
    .array(z.number().int().positive())
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, "Each menu only once.")
    .default([]),
});

export type UpdateMenuCategoryInput = z.infer<typeof updateMenuCategorySchema>;

/** The new order of the categories visible at the selected location —
 *  the Service checks it's exactly that set (MenuCategoryService.reorder). */
export const reorderMenuCategoriesSchema = z.object({
  orderedIds: z.array(z.number().int().positive()).min(1).max(500),
});

export type ReorderMenuCategoriesInput = z.infer<
  typeof reorderMenuCategoriesSchema
>;
