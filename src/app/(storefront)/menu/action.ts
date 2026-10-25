"use server";

import { after } from "next/server";
import { MenuService, MenuViewService } from "@/app/services";
import { menuDetailSchema } from "@/app/lib/schemas/customerOrderSchema";
import { checkMenuAccess } from "@/app/lib/storefront/menuAccessCheck";
import { menuViewerKeyAt } from "@/app/lib/storefront/menuViewer";

/** The customer menu detail — both customer flows (Counter and Table QR)
 *  and online browsing, via MenuDetailDialog. Staff New Order reads its
 *  own getStaffMenuDetailAction, which never counts a view.
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
  const detail = await MenuService.getMenuDetailForCustomer(
    parsed.data.menuId,
    parsed.data.locationId,
  );
  // A QR customer opened this menu: count the view (one per customer per
  // day — MenuViewService) AFTER the response has gone (next/server's
  // after), so it can never slow the detail down, and never let it
  // throw at the customer. Online visitors have no key — not counted.
  if (detail) {
    after(async () => {
      try {
        const viewerKey = await menuViewerKeyAt(parsed.data.locationId);
        if (viewerKey) {
          await MenuViewService.recordView({ viewerKey, ...parsed.data });
        }
      } catch (error) {
        console.error("[getMenuDetailAction] couldn't record the menu view:", error);
      }
    });
  }
  return detail;
}
