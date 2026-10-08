import { describe, it, expect } from "vitest";
import { parseMenuFormData } from "./menuFormData";

function form(entries: [string, string | File][]) {
  const data = new FormData();
  for (const [key, value] of entries) data.append(key, value);
  return data;
}

describe("parseMenuFormData", () => {
  it("reads the single fields as sent", () => {
    const parsed = parseMenuFormData(
      form([
        ["name", "Iced Latte"],
        ["price", "3500"],
        ["description", "Cold"],
        ["quantity", "12"],
      ]),
    );
    expect(parsed).toMatchObject({
      name: "Iced Latte",
      price: "3500",
      description: "Cold",
      quantity: "12",
    });
  });

  it("collects every repeated id field", () => {
    const parsed = parseMenuFormData(
      form([
        ["categoryIds", "1"],
        ["categoryIds", "2"],
        ["addonCategoryIds", "7"],
        ["shownLocationIds", "10"],
        ["shownLocationIds", "11"],
      ]),
    );
    expect(parsed.categoryIds).toEqual(["1", "2"]);
    expect(parsed.addonCategoryIds).toEqual(["7"]);
    expect(parsed.shownLocationIds).toEqual(["10", "11"]);
  });

  it("is available only when the field is exactly \"true\"", () => {
    expect(parseMenuFormData(form([["isAvailable", "true"]])).isAvailable).toBe(true);
    expect(parseMenuFormData(form([["isAvailable", "false"]])).isAvailable).toBe(false);
    expect(parseMenuFormData(form([])).isAvailable).toBe(false);
  });

  it("keeps a picked image file", () => {
    const image = new File(["png"], "latte.png", { type: "image/png" });
    expect(parseMenuFormData(form([["image", image]])).image).toBeInstanceOf(File);
  });

  it("treats an empty file input, or none, as no image", () => {
    const empty = new File([], "", { type: "application/octet-stream" });
    expect(parseMenuFormData(form([["image", empty]])).image).toBeNull();
    expect(parseMenuFormData(form([])).image).toBeNull();
  });
});
