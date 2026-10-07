import { describe, it, expect } from "vitest";
import { locationDeletion } from "./locationDeletion";

describe("locationDeletion", () => {
  it("allows deleting a location with no sales and no managers", () => {
    expect(locationDeletion({ hasSales: false, managerCount: 0 })).toEqual({
      allowed: true,
    });
  });

  it("never allows deleting a location with sales history", () => {
    expect(locationDeletion({ hasSales: true, managerCount: 0 })).toEqual({
      allowed: false,
      reason: "hasSales",
    });
  });

  it("refuses while managers are assigned to it", () => {
    expect(locationDeletion({ hasSales: false, managerCount: 2 })).toEqual({
      allowed: false,
      reason: "hasManagers",
    });
  });

  it("reports sales history first when both apply — moving managers wouldn't help", () => {
    expect(locationDeletion({ hasSales: true, managerCount: 1 })).toEqual({
      allowed: false,
      reason: "hasSales",
    });
  });
});
