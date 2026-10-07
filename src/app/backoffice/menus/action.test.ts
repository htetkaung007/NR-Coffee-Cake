import { describe, it, expect, vi, beforeEach } from "vitest";
import { NotFoundError } from "@/app/lib/errors";

// The session and every Service are stubbed (as in lib/roleGuard.test.ts)
// — the real requirePermission and the action's own steps run.
const getSessionContext = vi.fn();
const getGrantedPermissions = vi.fn();
const getSelectedLocation = vi.fn();
const getCompanyMenu = vi.fn();
const setManualDisabled = vi.fn();
vi.mock("@/app/lib/session", () => ({
  getSessionContext: () => getSessionContext(),
}));
vi.mock("@/app/services", () => ({
  PermissionService: { getGrantedPermissions: (...args: unknown[]) => getGrantedPermissions(...args) },
  LocationService: { getSelectedLocation: (...args: unknown[]) => getSelectedLocation(...args) },
  MenuService: { getCompanyMenu: (...args: unknown[]) => getCompanyMenu(...args) },
  MenuStockService: { setManualDisabled: (...args: unknown[]) => setManualDisabled(...args) },
}));
vi.mock("@/app/lib/storage/getFileStorageService", () => ({
  getFileStorageService: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { setMenuAvailableAction } from "./action";

const manager = { companyId: 1, userId: 7, role: "MANAGER" as const };

beforeEach(() => {
  vi.clearAllMocks();
  getSessionContext.mockResolvedValue(manager);
  getSelectedLocation.mockResolvedValue({ locationId: 10 });
  getCompanyMenu.mockResolvedValue({ id: 5, name: "Iced Latte" });
  setManualDisabled.mockResolvedValue({});
});

describe("setMenuAvailableAction", () => {
  it("refuses a manager without MENU_AVAILABILITY as FORBIDDEN, writing nothing", async () => {
    getGrantedPermissions.mockResolvedValue(["ORDERS_MARK_PAID"]);
    const result = await setMenuAvailableAction({ menuId: 5, isAvailable: false });
    expect(result).toMatchObject({ success: false, error: { code: "FORBIDDEN" } });
    expect(setManualDisabled).not.toHaveBeenCalled();
  });

  it("lets a manager with MENU_AVAILABILITY switch it off at their own location", async () => {
    getGrantedPermissions.mockResolvedValue(["MENU_AVAILABILITY"]);
    const result = await setMenuAvailableAction({ menuId: 5, isAvailable: false });
    expect(result).toEqual({ success: true, data: { menuId: 5, isAvailable: false } });
    expect(getCompanyMenu).toHaveBeenCalledWith(5, 1);
    expect(setManualDisabled).toHaveBeenCalledWith(5, 10, true);
  });

  it("answers NOT_FOUND for a menu of another company, writing nothing", async () => {
    getGrantedPermissions.mockResolvedValue(["MENU_AVAILABILITY"]);
    getCompanyMenu.mockRejectedValue(new NotFoundError("Menu", 99));
    const result = await setMenuAvailableAction({ menuId: 99, isAvailable: true });
    expect(result).toMatchObject({ success: false, error: { code: "NOT_FOUND" } });
    expect(setManualDisabled).not.toHaveBeenCalled();
  });

  it("refuses a signed-out caller", async () => {
    getSessionContext.mockResolvedValue({ companyId: null, userId: null, role: null });
    const result = await setMenuAvailableAction({ menuId: 5, isAvailable: true });
    expect(result).toMatchObject({ success: false });
    expect(setManualDisabled).not.toHaveBeenCalled();
  });
});
