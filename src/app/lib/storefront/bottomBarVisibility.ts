/**
 * The customer bottom bar's rules (Menu / Cart / History), in ONE place —
 * the bar itself (OrderBotBar) is mounted once in the storefront layout.
 * Pure, client-safe.
 */

export type BottomBarTab = "menu" | "cart" | "history";

/** What the page on screen says about the bar. */
export interface BottomBarScreenState {
  /** A full-screen state that has its own way on (ShopUnavailable, an
   *  order confirmed / rejected outcome screen) is showing. */
  hiddenByScreen: boolean;
}

/** Which tab a path belongs to; null — not a tab page (a QR scan screen,
 *  /counter/continue, anything else). */
export function bottomBarTab(pathname: string): BottomBarTab | null {
  if (pathname === "/menu") return "menu";
  if (pathname === "/cart") return "cart";
  if (pathname === "/history" || pathname.startsWith("/history/")) {
    return "history";
  }
  return null;
}

/** Shown on /menu, /cart, /history and /history/<orderId> — unless the
 *  page is showing a full-screen state of its own (HideBottomBar — the
 *  receipt, /history/<orderId>, always does: it has its own Back and
 *  Order more). */
export function isBottomBarVisible(
  pathname: string,
  state: BottomBarScreenState,
): boolean {
  return bottomBarTab(pathname) !== null && !state.hiddenByScreen;
}

/** The ids the tab pages read from their URL: locationId, plus tableId on
 *  a Table QR's pages. */
export interface BottomBarIds {
  locationId: number | null;
  tableId: number | null;
}

/** Each tab's link, carrying the ids exactly as the pages expect them
 *  (`/cart?locationId=3&tableId=7`); without a location, the bare path —
 *  never a guessed id. */
export function bottomBarHref(tab: BottomBarTab, ids: BottomBarIds): string {
  if (ids.locationId === null) return `/${tab}`;
  const query = new URLSearchParams({ locationId: String(ids.locationId) });
  if (ids.tableId !== null) query.set("tableId", String(ids.tableId));
  return `/${tab}?${query.toString()}`;
}

/** A positive whole-number id from a URL value, else null. */
export function idFromParam(value: string | null): number | null {
  if (value === null || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return id > 0 && Number.isSafeInteger(id) ? id : null;
}
