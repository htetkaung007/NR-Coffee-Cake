import { z } from "zod";

/** A database id sent as a number (JSON action arguments, a stored cart)
 *  — a positive whole number, never coerced: "5" or true is refused. */
export const idSchema = z.number().int().positive();

/** A database id from a form or query string (FormData values are
 *  strings) — coerced to a number, then a positive whole number. */
export const formIdSchema = z.coerce.number().int().positive();

const unique = (ids: number[]) => [...new Set(ids)];

/** Ids from a form field sent once per id (FormData.getAll), coerced and
 *  de-duplicated. `min` (with its message) and `max` are checked on the
 *  list as sent, before duplicates are dropped. */
export function idListSchema(
  options: { min?: number; minMessage?: string; max?: number } = {},
) {
  let list = z.array(formIdSchema);
  if (options.min !== undefined)
    list = list.min(options.min, options.minMessage);
  if (options.max !== undefined) list = list.max(options.max);
  return list.transform(unique);
}

/** idListSchema for a field that may be missing — missing reads as []. */
export function optionalIdListSchema() {
  return z
    .array(formIdSchema)
    .optional()
    .transform((ids) => unique(ids ?? []));
}
