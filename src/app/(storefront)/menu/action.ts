"use server";

import { MenuService } from "@/app/services";
import { menuDetailSchema } from "@/app/lib/schemas/customerOrderSchema";
import { checkMenuAccess } from "@/app/lib/storefront/menuAccessCheck";

/** Shared by both customer flows (Counter and Table QR) and the staff
 *  New Order page, via MenuDetailDialog.
 *
 *  No session required — but the menu-access rule is
 *  (lib/storefront/menuAccess): without a QR session at this location
 *  the detail is shown only while the online menu is on. locationId is
 *  passed explicitly (not read from a session) because there may be no
 *  session to read it from; checkMenuAccess looks it up. Returns null
 *  (not a thrown error) for a menu that doesn't exist, belongs to a
 *  different location's stock, fails validation or may not be seen —
 *  the modal treats all of them as "nothing to show". */
export async function getMenuDetailAction(menuId: number, locationId: number) {
  const parsed = menuDetailSchema.safeParse({ menuId, locationId });
  if (!parsed.success) return null;
  if ((await checkMenuAccess(parsed.data.locationId)) === "unavailable") {
    return null;
  }
  return MenuService.getMenuDetailForCustomer(
    parsed.data.menuId,
    parsed.data.locationId,
  );
}
