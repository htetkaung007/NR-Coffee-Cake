import { z } from "zod";
import { requiredName } from "./authSchema";

export const COMPANY_NAME_MAX_LENGTH = 60;

/** The company's name as staff see it in the Backoffice top bar: trimmed,
 *  inner whitespace collapsed to single spaces, not empty, and at most 60
 *  characters once normalised (counted per character, not UTF-16 unit). */
export const companyNameSchema = requiredName("Company name is required.")
  .transform((name) => name.replace(/\s+/g, " "))
  .refine(
    (name) => Array.from(name).length <= COMPANY_NAME_MAX_LENGTH,
    "Company name is too long.",
  );

export const updateCompanyNameSchema = z.object({ name: companyNameSchema });

export type UpdateCompanyNameInput = z.infer<typeof updateCompanyNameSchema>;
