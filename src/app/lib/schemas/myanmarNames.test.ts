import { describe, it, expect } from "vitest";
import { optionalTextSchema } from "./common";
import { createMenuCategorySchema } from "./menu_menuCategorySchema";
import { createAddonGroupSchema } from "./addonSchema";

describe("optionalTextSchema", () => {
  const field = optionalTextSchema(5);

  it("keeps text, trimmed", () => {
    expect(field.parse("  လာတေး ")).toBe("လာတေး");
  });

  it("reads empty, blank, missing and null as null", () => {
    expect(field.parse("")).toBeNull();
    expect(field.parse("   ")).toBeNull();
    expect(field.parse(undefined)).toBeNull();
    expect(field.parse(null)).toBeNull();
  });

  it("refuses text over the limit", () => {
    expect(field.safeParse("abcdef").success).toBe(false);
  });

  it("allows any script, not only Myanmar", () => {
    expect(field.parse("Café")).toBe("Café");
  });
});

describe("Myanmar names on the forms", () => {
  it("a category may have a Myanmar name, or none", () => {
    expect(
      createMenuCategorySchema.parse({ name: "Coffee", nameMy: " ကော်ဖီ ", isEnabled: true })
        .nameMy,
    ).toBe("ကော်ဖီ");
    expect(
      createMenuCategorySchema.parse({ name: "Coffee", isEnabled: true }).nameMy,
    ).toBeNull();
  });

  it("the English name stays required", () => {
    expect(
      createMenuCategorySchema.safeParse({ name: " ", nameMy: "ကော်ဖီ", isEnabled: true })
        .success,
    ).toBe(false);
  });

  it("an add-on group and each option may have Myanmar names", () => {
    const parsed = createAddonGroupSchema.parse({
      groupName: "Milk",
      groupNameMy: "နို့",
      isRequired: false,
      options: [
        { name: "Oat", nameMy: "အုတ်နို့", price: "500" },
        { name: "Soy", nameMy: "", price: "" },
      ],
      menuIds: [],
    });
    expect(parsed.groupNameMy).toBe("နို့");
    expect(parsed.options.map((option) => option.nameMy)).toEqual(["အုတ်နို့", null]);
  });

  it("an option's Myanmar name has the English name's limit (120)", () => {
    const result = createAddonGroupSchema.safeParse({
      groupName: "Milk",
      isRequired: false,
      options: [{ name: "Oat", nameMy: "က".repeat(121), price: "" }],
      menuIds: [],
    });
    expect(result.success).toBe(false);
  });
});
