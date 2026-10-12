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
import { menuAccess, type MenuAccess } from "./menuAccess";

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
 * actions. The server decides — "unavailable" means no menu data is
 * loaded or sent.
 */
export async function checkMenuAccess(
  locationId: number | null,
): Promise<MenuAccess> {
  const location = locationId
    ? await LocationService.getLocationById(locationId)
    : null;
  if (!location) {
    return menuAccess({
      locationExists: false,
      isArchived: false,
      onlineMenuEnabled: false,
      hasQrSession: false,
    });
  }
  // Only look for a session when it would change the answer.
  const hasQrSession =
    !location.isArchived && !location.onlineMenuEnabled
      ? await hasQrSessionAt(location.id)
      : false;
  return menuAccess({
    locationExists: true,
    isArchived: location.isArchived,
    onlineMenuEnabled: location.onlineMenuEnabled,
    hasQrSession,
  });
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
