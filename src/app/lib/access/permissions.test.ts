import { describe, it, expect } from "vitest";
import {
  ALWAYS_ALLOWED,
  canAccess,
  permissionChanges,
  DEFAULT_MANAGER_PERMISSIONS,
  GRANTABLE_PERMISSIONS,
  hasPermission,
  isPermissionKey,
  OWNER_ONLY,
} from "./permissions";

describe("hasPermission", () => {
  it("always lets an ADMIN (owner) through, with no grants at all", () => {
    for (const { key } of GRANTABLE_PERMISSIONS) {
      expect(hasPermission("ADMIN", [], key)).toBe(true);
    }
  });

  it("lets a MANAGER do only what was granted", () => {
    const granted = ["ORDERS_MARK_PAID", "ADDON_AVAILABILITY"] as const;
    expect(hasPermission("MANAGER", granted, "ORDERS_MARK_PAID")).toBe(true);
    expect(hasPermission("MANAGER", granted, "ADDON_AVAILABILITY")).toBe(true);
    expect(hasPermission("MANAGER", granted, "REPORTS_VIEW")).toBe(false);
    expect(hasPermission("MANAGER", [], "ORDERS_MARK_PAID")).toBe(false);
  });
});

describe("the catalog", () => {
  it("gives a new manager exactly mark-paid, menu and add-on on/off", () => {
    expect(DEFAULT_MANAGER_PERMISSIONS).toEqual([
      "ORDERS_MARK_PAID",
      "MENU_AVAILABILITY",
      "ADDON_AVAILABILITY",
    ]);
  });

  it("has no duplicate keys", () => {
    const keys = GRANTABLE_PERMISSIONS.map((entry) => entry.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("gives every permission a label and a description", () => {
    for (const entry of GRANTABLE_PERMISSIONS) {
      expect(entry.label.trim()).not.toBe("");
      expect(entry.description.trim()).not.toBe("");
    }
  });
});

describe("isPermissionKey", () => {
  it("accepts every catalog key", () => {
    for (const { key } of GRANTABLE_PERMISSIONS) {
      expect(isPermissionKey(key)).toBe(true);
    }
  });

  it.each([["orders_mark_paid"], [""], ["ADMIN"], ["TAKE_ORDERS"]])(
    "rejects %j",
    (value) => {
      expect(isPermissionKey(value)).toBe(false);
    },
  );
});

describe("what is never ticked", () => {
  it("spells out what every manager can always do, and what only the owner can", () => {
    for (const line of [...ALWAYS_ALLOWED, ...OWNER_ONLY]) {
      expect(line.trim()).not.toBe("");
    }
    expect(ALWAYS_ALLOWED.length).toBeGreaterThan(0);
    expect(OWNER_ONLY.length).toBeGreaterThan(0);
  });

  it("never offers an owner-only area as a grantable permission", () => {
    const grantableLabels = GRANTABLE_PERMISSIONS.map((entry) => entry.label.toLowerCase());
    for (const area of OWNER_ONLY) {
      expect(grantableLabels).not.toContain(area.toLowerCase());
    }
  });
});

describe("canAccess", () => {
  it("lets any signed-in staff do the always-allowed work", () => {
    expect(canAccess("MANAGER", [], "staff")).toBe(true);
    expect(canAccess("ADMIN", [], "staff")).toBe(true);
  });

  it("keeps owner-only things for the owner", () => {
    expect(canAccess("ADMIN", [], "owner")).toBe(true);
    expect(canAccess("MANAGER", ["REPORTS_VIEW", "TABLES_MANAGE"], "owner")).toBe(false);
  });

  it("lets a manager through a permission rule only when granted", () => {
    expect(canAccess("MANAGER", ["TABLES_MANAGE"], "TABLES_MANAGE")).toBe(true);
    expect(canAccess("MANAGER", [], "TABLES_MANAGE")).toBe(false);
    expect(canAccess("ADMIN", [], "TABLES_MANAGE")).toBe(true);
  });
});

describe("permissionChanges", () => {
  it("changes nothing when the ticks are the same", () => {
    expect(
      permissionChanges(["ORDERS_MARK_PAID", "REPORTS_VIEW"], ["REPORTS_VIEW", "ORDERS_MARK_PAID"]),
    ).toEqual({ add: [], remove: [] });
  });

  it("adds only what is newly ticked", () => {
    expect(permissionChanges(["ORDERS_MARK_PAID"], ["ORDERS_MARK_PAID", "TABLES_MANAGE"])).toEqual({
      add: ["TABLES_MANAGE"],
      remove: [],
    });
  });

  it("removes only what is no longer ticked", () => {
    expect(permissionChanges(["ORDERS_MARK_PAID", "REPORTS_VIEW"], ["ORDERS_MARK_PAID"])).toEqual({
      add: [],
      remove: ["REPORTS_VIEW"],
    });
  });

  it("adds and removes in one go", () => {
    expect(permissionChanges(["REPORTS_VIEW"], ["TABLES_MANAGE"])).toEqual({
      add: ["TABLES_MANAGE"],
      remove: ["REPORTS_VIEW"],
    });
  });

  it("ignores duplicates in the new ticks", () => {
    expect(permissionChanges([], ["TABLES_MANAGE", "TABLES_MANAGE"])).toEqual({
      add: ["TABLES_MANAGE"],
      remove: [],
    });
  });
});
