import { describe, it, expect, vi, beforeEach } from "vitest";

// The guards read the NextAuth session and the database — both stubbed,
// so only the rule itself runs (as in menuCategory.service.test.ts).
const getSessionContext = vi.fn();
const getGrantedPermissions = vi.fn();
const getSelectedLocation = vi.fn();
vi.mock("./session", () => ({ getSessionContext: () => getSessionContext() }));
vi.mock("@/app/services", () => ({
  PermissionService: {
    getGrantedPermissions: (userId: number) => getGrantedPermissions(userId),
  },
  LocationService: {
    getSelectedLocation: (userId: number) => getSelectedLocation(userId),
  },
}));

import { requireOwner, requirePermission, requireStaff } from "./roleGuard";

const signedIn = (role: "ADMIN" | "MANAGER") => ({ companyId: 1, userId: 7, role });

beforeEach(() => {
  getSessionContext.mockReset();
  getGrantedPermissions.mockReset();
  getSelectedLocation.mockReset();
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

describe("the withLocation option", () => {
  it("returns the scope alone, without looking up a location, by default", async () => {
    getSessionContext.mockResolvedValue(signedIn("ADMIN"));
    const scope = await requireOwner();
    expect(scope).not.toHaveProperty("locationId");
    expect(getSelectedLocation).not.toHaveBeenCalled();
  });

  it("adds the user's selected location to the scope", async () => {
    getSessionContext.mockResolvedValue(signedIn("MANAGER"));
    getSelectedLocation.mockResolvedValue({ locationId: 10 });
    await expect(requireStaff({ withLocation: true })).resolves.toEqual({
      companyId: 1,
      userId: 7,
      role: "MANAGER",
      locationId: 10,
    });
    expect(getSelectedLocation).toHaveBeenCalledWith(7);
  });

  it("refuses with NO_SELECTED_LOCATION when there is none", async () => {
    getSessionContext.mockResolvedValue(signedIn("ADMIN"));
    getSelectedLocation.mockResolvedValue(null);
    await expect(requireOwner({ withLocation: true })).rejects.toMatchObject({
      code: "NO_SELECTED_LOCATION",
      message: "Select a location first.",
    });
  });

  it("checks the permission before the location", async () => {
    getSessionContext.mockResolvedValue(signedIn("MANAGER"));
    getGrantedPermissions.mockResolvedValue([]);
    await expect(
      requirePermission("REPORTS_VIEW", { withLocation: true }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(getSelectedLocation).not.toHaveBeenCalled();
  });

  it("works with requirePermission once allowed", async () => {
    getSessionContext.mockResolvedValue(signedIn("MANAGER"));
    getGrantedPermissions.mockResolvedValue(["REPORTS_VIEW"]);
    getSelectedLocation.mockResolvedValue({ locationId: 4 });
    await expect(
      requirePermission("REPORTS_VIEW", { withLocation: true }),
    ).resolves.toMatchObject({ locationId: 4 });
  });
});
