import { describe, it, expect } from "vitest";
import { canActAtLocation, firstUnownedId } from "./ownership";

const owner = { companyId: 1, role: "ADMIN" as const, locationId: 10 };
const manager = { companyId: 1, role: "MANAGER" as const, locationId: 10 };

describe("canActAtLocation", () => {
  it("lets the owner act at any location of their company", () => {
    expect(canActAtLocation(owner, { companyId: 1, locationId: 10 })).toBe(true);
    expect(canActAtLocation(owner, { companyId: 1, locationId: 11 })).toBe(true);
  });

  it("lets a manager act at their own location", () => {
    expect(canActAtLocation(manager, { companyId: 1, locationId: 10 })).toBe(true);
  });

  it("refuses a manager at another location of the same company", () => {
    expect(canActAtLocation(manager, { companyId: 1, locationId: 11 })).toBe(false);
  });

  it("refuses anyone at another company's location, even with the same location id", () => {
    expect(canActAtLocation(owner, { companyId: 2, locationId: 10 })).toBe(false);
    expect(canActAtLocation(manager, { companyId: 2, locationId: 10 })).toBe(false);
  });
});

describe("firstUnownedId", () => {
  it("returns null when every requested id is owned", () => {
    expect(firstUnownedId([3, 1], [1, 2, 3])).toBeNull();
  });

  it("returns null for an empty request", () => {
    expect(firstUnownedId([], [])).toBeNull();
  });

  it("returns the first requested id that isn't owned", () => {
    expect(firstUnownedId([1, 7, 8], [1, 2])).toBe(7);
  });
});
