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

  it("collects the photo slots and the new files, in the order sent", () => {
    const first = new File(["a"], "a.png", { type: "image/png" });
    const second = new File(["b"], "b.jpg", { type: "image/jpeg" });
    const parsed = parseMenuFormData(
      form([
        ["imageSlots", "new:0"],
        ["imageSlots", "keep:41"],
        ["imageSlots", "new:1"],
        ["newImages", first],
        ["newImages", second],
      ]),
    );
    expect(parsed.imageSlots).toEqual(["new:0", "keep:41", "new:1"]);
    expect(parsed.newImages).toEqual([first, second]);
  });

  it("sends no photos as empty lists (the menu then has none)", () => {
    const parsed = parseMenuFormData(form([]));
    expect(parsed.imageSlots).toEqual([]);
    expect(parsed.newImages).toEqual([]);
  });
});
