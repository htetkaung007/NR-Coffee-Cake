import { z } from "zod";

export const createTableSchema = z
  .object({
    name: z.string().trim().max(60),
    isCounter: z.boolean().default(false),
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
  })
  // name is required for a regular table, but irrelevant for the
  // counter — TableService.createTable overwrites it with the fixed
  // "Counter QR code" name regardless of what's submitted, so an
  // empty/disabled field here shouldn't block submission.
  .refine((data) => data.isCounter || data.name.length > 0, {
    message: "Table name is required.",
    path: ["name"],
  });

export type CreateTableInput = z.infer<typeof createTableSchema>;

export const updateTableSchema = z.object({
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

export type UpdateTableInput = z.infer<typeof updateTableSchema>;
