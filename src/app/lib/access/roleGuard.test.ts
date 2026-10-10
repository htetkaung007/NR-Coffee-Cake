import { describe, it, expect, vi, beforeEach } from "vitest";

// The guards read the NextAuth session and the database — both stubbed,
// so only the rule itself runs (as in menuCategory.service.test.ts).
const getSessionContext = vi.fn();
const getGrantedPermissions = vi.fn();
const getSelectedLocation = vi.fn();
const userExistsInCompany = vi.fn();
vi.mock("./session", () => ({ getSessionContext: () => getSessionContext() }));
vi.mock("@/app/services", () => ({
  PermissionService: {
    getGrantedPermissions: (userId: number) => getGrantedPermissions(userId),
    userExistsInCompany: (userId: number, companyId: number) =>
      userExistsInCompany(userId, companyId),
  },
  LocationService: {
    getSelectedLocation: (userId: number, companyId: number) =>
      getSelectedLocation(userId, companyId),
  },
}));

import { requireOwner, requirePermission, requireStaff } from "./roleGuard";

const signedIn = (role: "ADMIN" | "MANAGER") => ({ companyId: 1, userId: 7, role });

beforeEach(() => {
  getSessionContext.mockReset();
  getGrantedPermissions.mockReset();
  getSelectedLocation.mockReset();
  userExistsInCompany.mockReset();
  // The session's user still exists, unless a test removes them.
  userExistsInCompany.mockResolvedValue(true);
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
    expect(getSelectedLocation).toHaveBeenCalledWith(7, 1);
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

describe("a session whose user no longer exists (a removed manager)", () => {
  it("is signed out for requireStaff, checked against the session's company", async () => {
    getSessionContext.mockResolvedValue(signedIn("MANAGER"));
    userExistsInCompany.mockResolvedValue(false);
    await expect(requireStaff()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "You must be signed in.",
    });
    expect(userExistsInCompany).toHaveBeenCalledWith(7, 1);
  });

  it("is signed out for requirePermission, before any grants are read", async () => {
    getSessionContext.mockResolvedValue(signedIn("MANAGER"));
    userExistsInCompany.mockResolvedValue(false);
    await expect(requirePermission("REPORTS_VIEW")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(getGrantedPermissions).not.toHaveBeenCalled();
  });

  it("is signed out for requireOwner too — the owner is checked the same way", async () => {
    getSessionContext.mockResolvedValue(signedIn("ADMIN"));
    userExistsInCompany.mockResolvedValue(false);
    await expect(requireOwner()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("never reaches the database when there is no session at all", async () => {
    getSessionContext.mockResolvedValue({ companyId: null, userId: null, role: "MANAGER" });
    await expect(requireStaff()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(userExistsInCompany).not.toHaveBeenCalled();
  });

  it("is not asked for a location once signed out", async () => {
    getSessionContext.mockResolvedValue(signedIn("ADMIN"));
    userExistsInCompany.mockResolvedValue(false);
    await expect(requireOwner({ withLocation: true })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect(getSelectedLocation).not.toHaveBeenCalled();
  });
});
