import { describe, it, expect } from "vitest";
import { menuDeletionMode } from "./menuDeletion";

describe("menuDeletionMode", () => {
  it("deletes a menu no order line has ever used", () => {
    expect(menuDeletionMode(0)).toBe("delete");
  });

  it("archives a menu one order line uses", () => {
    expect(menuDeletionMode(1)).toBe("archive");
  });

  it("archives a menu many order lines use", () => {
    expect(menuDeletionMode(250)).toBe("archive");
  });
});
