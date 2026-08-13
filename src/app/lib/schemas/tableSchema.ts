import { z } from "zod";

export const createTableSchema = z.object({
  name: z.string().trim().min(1, "Table name is required.").max(60),
  logo: z
    .custom<File | null>((value) => value === null || value instanceof File, {
      message: "Logo upload is invalid.",
    })
    .refine(
      (file) => file === null || file.size <= 5 * 1024 * 1024,
      "Logo must be 5MB or smaller.",
    )
    .refine(
      (file) =>
        file === null ||
        ["image/jpeg", "image/png", "image/webp"].includes(file.type),
      "Logo must be a PNG, JPEG, or WEBP file.",
    ),
});

export type CreateTableInput = z.infer<typeof createTableSchema>;

export const updateTableSchema = z.object({
  name: z.string().trim().min(1, "Table name is required.").max(60),
});

export type UpdateTableInput = z.infer<typeof updateTableSchema>;
