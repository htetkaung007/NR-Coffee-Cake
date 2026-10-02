"use server";

import { MenuService } from "@/app/services";
import { menuDetailSchema } from "@/app/lib/schemas/customerOrderSchema";

/** Shared by both customer flows (Counter and Table QR) and the staff
 *  New Order page, via MenuDetailDialog.
 *
 *  No session required — view-only browsing (hasSession=false) can
 *  open a menu's detail the same as an active order can, so this
 *  doesn't go through requireSessionFromCookie. locationId is passed
 *  explicitly (not read from a session) for that same reason: there
 *  may be no session to read it from. Returns null (not a thrown
 *  error) for a menu that doesn't exist, belongs to a different
 *  location's stock, or fails validation — the modal treats all three
 *  as "nothing to show" rather than an error state. */
export async function getMenuDetailAction(menuId: number, locationId: number) {
  const parsed = menuDetailSchema.safeParse({ menuId, locationId });
  if (!parsed.success) return null;
  return MenuService.getMenuDetailForCustomer(
    parsed.data.menuId,
    parsed.data.locationId,
  );
}
