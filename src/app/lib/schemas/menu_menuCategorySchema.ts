import { z } from "zod";

export const createMenuSchema = z.object({
  name: z.string().trim().min(1, "Menu item name is required.").max(120),
  description: z
    .string()
    .trim()
    .max(100, "Description cannot exceed 100 characters."),
  price: z.coerce
    .number()
    .int("Price must be a whole number of MMK.")
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

export const createMenuCategorySchema = z.object({
  name: z.string().trim().min(1, "Category name is required.").max(50),
});

export type CreateMenuCategoryInput = z.infer<typeof createMenuCategorySchema>;
