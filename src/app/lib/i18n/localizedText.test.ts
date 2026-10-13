import { describe, it, expect } from "vitest";
import { localizedText } from "./localizedText";

describe("localizedText", () => {
  it("shows the English text to English customers, even with a Myanmar one", () => {
    expect(localizedText("en", "Iced Latte", "အေးလာတေး")).toBe("Iced Latte");
  });

  it("shows the Myanmar text to Myanmar customers when there is one", () => {
    expect(localizedText("my", "Iced Latte", "အေးလာတေး")).toBe("အေးလာတေး");
  });

  it("falls back to English when there's no Myanmar text", () => {
    expect(localizedText("my", "Iced Latte", null)).toBe("Iced Latte");
    expect(localizedText("my", "Iced Latte", undefined)).toBe("Iced Latte");
  });

  it("falls back to English when the Myanmar text is only spaces", () => {
    expect(localizedText("my", "Iced Latte", "  ")).toBe("Iced Latte");
  });

  it("returns the Myanmar text as stored (no trimming of real text)", () => {
    expect(localizedText("my", "Latte", "လာတေး")).toBe("လာတေး");
  });
});
