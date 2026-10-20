import { describe, it, expect } from "vitest";
import type { ZodType } from "zod";
import {
  createMenuCategorySchema,
  createMenuSchema,
} from "./menu_menuCategorySchema";
import { createAddonGroupSchema, updateAddonGroupSchema } from "./addonSchema";

/** The longest text `schema` accepts (no spaces, so trimming changes
 *  nothing) — found by trying lengths, never read from the code. */
function longestAccepted(schema: ZodType) {
  let length = 1;
  while (length < 1000 && schema.safeParse("a".repeat(length + 1)).success) length += 1;
  return length;
}

describe("an English field and its Myanmar twin have the same limit", () => {
  const menu = createMenuSchema.shape;
  const category = createMenuCategorySchema.shape;
  const option = createAddonGroupSchema.shape.options.element.shape;

  it.each([
    ["menu name", menu.name, menu.nameMy],
    ["menu description", menu.description, menu.descriptionMy],
    ["category name", category.name, category.nameMy],
    ["add-on group title", createAddonGroupSchema.shape.groupName, createAddonGroupSchema.shape.groupNameMy],
    ["add-on group title (edit)", updateAddonGroupSchema.shape.groupName, updateAddonGroupSchema.shape.groupNameMy],
    ["option name", option.name, option.nameMy],
  ])("%s", (_field, english, myanmar) => {
    expect(longestAccepted(myanmar as ZodType)).toBe(longestAccepted(english as ZodType));
  });
});
