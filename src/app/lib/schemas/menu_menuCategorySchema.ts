import { z } from "zod";
import { idListSchema, idSchema, optionalIdListSchema } from "./common";
import { CURRENCY_LABEL } from "@/app/lib/orderFormat";
import { NO_LOCATION_MESSAGE } from "@/app/lib/menu/menuLocations";

/** Most locations one company can tick on a menu form. */
const MAX_SHOWN_LOCATIONS = 50;

/** The menu form's messages — exported so the form's own check
 *  (lib/menu/menuFormProblems.ts, UX only) says exactly what this schema,
 *  the real check, says. */
export const MENU_NAME_REQUIRED_MESSAGE = "Menu item name is required.";
export const MENU_PRICE_WHOLE_MESSAGE = `Price must be a whole number of ${CURRENCY_LABEL}.`;
export const MENU_PRICE_POSITIVE_MESSAGE = "Price must be greater than zero.";
export const MENU_CATEGORY_REQUIRED_MESSAGE = "Select at least one menu category.";

export const createMenuSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, MENU_NAME_REQUIRED_MESSAGE)
    .max(50, "Menu item name cannot exceed 50 characters."),
  description: z
    .string()
    .trim()
    .max(100, "Description cannot exceed 100 characters."),
  price: z.coerce
    .number()
    .int(MENU_PRICE_WHOLE_MESSAGE)
    .positive(MENU_PRICE_POSITIVE_MESSAGE),
  quantity: z.coerce
    .number()
    .int("Stock quantity must be a whole number.")
    .min(0, "Stock quantity cannot be negative."),
  isAvailable: z.boolean(),
  categoryIds: idListSchema({
    min: 1,
    minMessage: MENU_CATEGORY_REQUIRED_MESSAGE,
  }),
  addonCategoryIds: optionalIdListSchema(),
  /** Where the menu shows — company/active-location membership is
   *  checked by MenuLocationService.setMenuLocations. */
  shownLocationIds: idListSchema({
    min: 1,
    minMessage: NO_LOCATION_MESSAGE,
    max: MAX_SHOWN_LOCATIONS,
  }),
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
  menuId: idSchema,
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
    .array(idSchema)
    .max(200)
    .refine((ids) => new Set(ids).size === ids.length, "Each menu only once.")
    .default([]),
});

export type UpdateMenuCategoryInput = z.infer<typeof updateMenuCategorySchema>;

/** The new order of the categories visible at the selected location —
 *  the Service checks it's exactly that set (MenuCategoryService.reorder). */
export const reorderMenuCategoriesSchema = z.object({
  orderedIds: z.array(idSchema).min(1).max(500),
});

export type ReorderMenuCategoriesInput = z.infer<
  typeof reorderMenuCategoriesSchema
>;
