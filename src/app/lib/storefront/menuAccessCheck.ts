import { cookies } from "next/headers";
import {
  CartSubmitService,
  LocationService,
  TableDraftService,
} from "@/app/services";
import {
  COUNTER_SESSION_COOKIE,
  CONTRIBUTOR_TOKEN_COOKIE,
} from "./orderSessionCookie";
import { parseContributorTokenMap } from "./contributorToken";
import { menuAccess } from "./menuAccess";

/** checkMenuAccess's answer: the menu, or why not. With "onlineMenuOff"
 *  comes the location's name (the storefront's shop name) for the
 *  friendly screen — from the row the check reads anyway. */
export type MenuAccessResult =
  | { access: "menu" }
  | { access: "onlineMenuOff"; shopName: string }
  | { access: "locationUnavailable" };

/**
 * The server side of the menu-access rule (menuAccess): looks the
 * location up and asks whether THIS browser has a QR session there,
 * through the existing checks only — the Counter cookie's session
 * (CartSubmitService.getSendState, read-only: anything but "needsScan"
 * is a session here) or a current Table contributor token for a table
 * at this location (TableDraftService.hasCurrentTokenAtLocation, the
 * isTokenCurrentForTable epoch rule). Reads cookies, writes nothing.
 *
 * Every place that shows menu data without a QR session calls this
 * first: the menu and cart pages, the menu detail and cart-check
 * actions. The server decides — anything but "menu" means no menu data
 * is loaded or sent (the reason only picks the words — ShopUnavailable).
 */
export async function checkMenuAccess(
  locationId: number | null,
): Promise<MenuAccessResult> {
  const location = locationId
    ? await LocationService.getLocationById(locationId)
    : null;
  if (!location) return { access: "locationUnavailable" };
  // Only look for a session when it would change the answer.
  const hasQrSession =
    !location.isArchived && !location.onlineMenuEnabled
      ? await hasQrSessionAt(location.id)
      : false;
  const access = menuAccess({
    locationExists: true,
    isArchived: location.isArchived,
    onlineMenuEnabled: location.onlineMenuEnabled,
    hasQrSession,
  });
  return access === "onlineMenuOff"
    ? { access, shopName: location.name }
    : { access };
}

/** Does this browser hold a QR session for `locationId` — the Counter
 *  cookie's, or a Table token for a table there? */
async function hasQrSessionAt(locationId: number) {
  const store = await cookies();
  const counterToken = store.get(COUNTER_SESSION_COOKIE)?.value ?? null;
  if (
    counterToken &&
    (await CartSubmitService.getSendState(locationId, counterToken)) !== "needsScan"
  ) {
    return true;
  }
  const tableTokens = parseContributorTokenMap(
    store.get(CONTRIBUTOR_TOKEN_COOKIE)?.value,
  );
  return TableDraftService.hasCurrentTokenAtLocation(locationId, tableTokens);
}
