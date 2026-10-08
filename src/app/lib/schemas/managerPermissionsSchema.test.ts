import { describe, it, expect } from "vitest";
import { PERMISSION_KEYS } from "@/app/lib/access/permissions";
import { setManagerPermissionsSchema } from "./managerPermissionsSchema";

describe("setManagerPermissionsSchema", () => {
  it("accepts a manager id and catalog permissions", () => {
    const result = setManagerPermissionsSchema.safeParse({
      managerId: 3,
      permissions: ["ORDERS_MARK_PAID", "REPORTS_VIEW"],
    });
    expect(result.success).toBe(true);
  });

  it("accepts an empty list (a manager with no extras)", () => {
    expect(
      setManagerPermissionsSchema.safeParse({ managerId: 3, permissions: [] })
        .success,
    ).toBe(true);
  });

  it("rejects a permission that isn't in the catalog", () => {
    expect(
      setManagerPermissionsSchema.safeParse({
        managerId: 3,
        permissions: ["DELETE_EVERYTHING"],
      }).success,
    ).toBe(false);
  });

  it("rejects more entries than the catalog has", () => {
    expect(
      setManagerPermissionsSchema.safeParse({
        managerId: 3,
        permissions: [...PERMISSION_KEYS, PERMISSION_KEYS[0]],
      }).success,
    ).toBe(false);
  });

  it("rejects a missing or non-positive manager id", () => {
    expect(
      setManagerPermissionsSchema.safeParse({ managerId: 0, permissions: [] })
        .success,
    ).toBe(false);
    expect(
      setManagerPermissionsSchema.safeParse({ permissions: [] }).success,
    ).toBe(false);
  });

  it("ignores a companyId or ownerId sent by the client", () => {
    const result = setManagerPermissionsSchema.safeParse({
      managerId: 3,
      permissions: [],
      companyId: 99,
      ownerId: 99,
    });
    expect(result.success && Object.keys(result.data)).toEqual([
      "managerId",
      "permissions",
    ]);
  });
});
