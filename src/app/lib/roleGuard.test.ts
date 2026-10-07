import { describe, it, expect, vi, beforeEach } from "vitest";

// The guards read the NextAuth session and the database — both stubbed,
// so only the rule itself runs (as in menuCategory.service.test.ts).
const getSessionContext = vi.fn();
const getGrantedPermissions = vi.fn();
vi.mock("./session", () => ({ getSessionContext: () => getSessionContext() }));
vi.mock("@/app/services", () => ({
  PermissionService: {
    getGrantedPermissions: (userId: number) => getGrantedPermissions(userId),
  },
}));

import { requireOwner, requirePermission, requireStaff } from "./roleGuard";

const signedIn = (role: "ADMIN" | "MANAGER") => ({ companyId: 1, userId: 7, role });

beforeEach(() => {
  getSessionContext.mockReset();
  getGrantedPermissions.mockReset();
});

describe("requirePermission", () => {
  it("lets the owner through without reading any grants", async () => {
    getSessionContext.mockResolvedValue(signedIn("ADMIN"));
    await expect(requirePermission("REPORTS_VIEW")).resolves.toMatchObject({
      role: "ADMIN",
    });
    expect(getGrantedPermissions).not.toHaveBeenCalled();
  });

  it("lets a manager through when the owner granted that permission", async () => {
    getSessionContext.mockResolvedValue(signedIn("MANAGER"));
    getGrantedPermissions.mockResolvedValue(["ORDERS_MARK_PAID", "REPORTS_VIEW"]);
    await expect(requirePermission("REPORTS_VIEW")).resolves.toMatchObject({
      role: "MANAGER",
      userId: 7,
    });
    expect(getGrantedPermissions).toHaveBeenCalledWith(7);
  });

  it("refuses a manager without it, as FORBIDDEN with a safe message", async () => {
    getSessionContext.mockResolvedValue(signedIn("MANAGER"));
    getGrantedPermissions.mockResolvedValue(["ORDERS_MARK_PAID"]);
    await expect(requirePermission("REPORTS_VIEW")).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "You don't have permission to do this. Ask the owner.",
    });
  });

  it("refuses someone signed out, as UNAUTHORIZED", async () => {
    getSessionContext.mockResolvedValue({ companyId: null, userId: null, role: "MANAGER" });
    await expect(requirePermission("REPORTS_VIEW")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(getGrantedPermissions).not.toHaveBeenCalled();
  });
});

describe("requireOwner and requireStaff", () => {
  it("refuses a manager owner-only actions", async () => {
    getSessionContext.mockResolvedValue(signedIn("MANAGER"));
    await expect(requireOwner()).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "Only the owner can do this.",
    });
  });

  it("lets any signed-in staff do the always-allowed order work", async () => {
    getSessionContext.mockResolvedValue(signedIn("MANAGER"));
    await expect(requireStaff()).resolves.toMatchObject({ role: "MANAGER" });
  });
});
