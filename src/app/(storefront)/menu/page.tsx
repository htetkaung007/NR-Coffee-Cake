import { cookies } from "next/headers";
import {
  CounterSessionService,
  LocationService,
  MenuService,
  TableDraftService,
  TableSessionService,
} from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/storefront/orderSessionCookie";
import CounterOrderClient from "@/app/components/orderUI/CounterOrderClient";
import TableOrderClient from "@/app/components/orderUI/TableOrderClient";
import { toDraftLine } from "@/app/lib/order/roundLine";
import { readTableSessionPlace } from "@/app/lib/storefront/tableSessionAccess";
import { checkMenuAccess } from "@/app/lib/storefront/menuAccessCheck";
import ShopUnavailable from "@/app/components/orderUI/ShopUnavailable";
import { parseOpenPlaceNotice } from "@/app/lib/storefront/openOrderPlace";

// Session/cart state can change between one visit and the next (a
// customer's own submit, or another contributor's draft add) —
// cookies() already makes this render dynamic, but forcing it
// explicitly also stops Next's client Router Cache from ever serving
// a stale copy of this route after navigating away and back (e.g. the
// cart icon then the browser's own Back button).
export const dynamic = "force-dynamic";

function buildMenuOptions(
  menus: Awaited<ReturnType<typeof MenuService.getMenusForLocation>>["menus"],
) {
  return menus.map((menu) => ({
    id: menu.id,
    name: menu.name,
    nameMy: menu.nameMy,
    price: menu.price,
    description: menu.description,
    descriptionMy: menu.descriptionMy,
    categories: menu.categories,
    imageUrl: menu.imageUrl,
    stockQuantity: menu.stockQuantity,
    // getMenusForLocation exposes isManuallyDisabled (staff toggle),
    // not isAvailable directly — MenuCard's own isAvailable check
    // ANDs this with stockQuantity > 0, matching
    // getMenuDetailForCustomer's `!isManuallyDisabled` definition.
    isAvailable: !menu.isManuallyDisabled,
  }));
}

/**
 * One page for viewing and ordering: it branches between Table QR (the
 * per-customer shared draft — TableOrderClient) and Counter QR / plain
 * browsing (the session cookie — CounterOrderClient). Both get the same
 * menu list (buildMenuOptions).
 *
 * A tableId alone isn't trusted: without this browser's contributor
 * token for that table (never scanned — a typed URL), or with a stale
 * one (the table was paid since, Table.contributorEpoch moved on; a new
 * scan gives a new token), the page falls through to the Counter /
 * browsing view.
 *
 * SECURITY NOTE: hiding Add / Submit without a session is UX only. The
 * real checks are in the Server Actions (the Counter cookie,
 * requireContributorToken for a table) — calling one directly without
 * the session is refused there. Who may SEE the menu is the menu-access
 * rule (lib/storefront/menuAccess).
 */
export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{
    locationId?: string;
    tableId?: string;
    scanned?: string;
    notice?: string;
  }>;
}) {
  const { scanned, notice, ...ids } = await searchParams;
  // Sent back from a QR scan to the place this phone already has here
  // (lib/storefront/openOrderPlace) — an untrusted flag, words only.
  const openPlaceNotice = parseOpenPlaceNotice(notice);
  // Untrusted URL ids, and this browser's Table QR session there if any
  // (lib/storefront/tableSessionAccess).
  const { urlLocationId: locationId, table } = await readTableSessionPlace(ids);

  if (table) {
    const { tableId, locationId, contributorToken } = table;
    // Scanned in: the menu works, online menu on or off — unless the
    // location is gone or closed (lib/storefront/menuAccess).
    if ((await checkMenuAccess(locationId)) === "unavailable") {
      return <ShopUnavailable />;
    }
    const [menuData, shopName, draftItems, activeRound, labels, tableName] =
      await Promise.all([
        MenuService.getMenusForLocation(locationId),
        LocationService.getShopNameForLocation(locationId),
        TableDraftService.getDraftItemsForTable(tableId),
        TableSessionService.getActiveRoundForTable(tableId),
        // Who's who as labels — the tokens stay on the server.
        TableDraftService.getContributorLabels(tableId, contributorToken),
        // For the "where am I" line — the name only.
        TableSessionService.getTableName(tableId, locationId),
      ]);

    return (
      <TableOrderClient
        tableId={tableId}
        tableName={tableName ?? ""}
        locationId={locationId}
        shopName={shopName}
        initialDraftItems={draftItems.map((item) => toDraftLine(item, labels))}
        initialAwaitingApproval={activeRound?.status === "PENDING_APPROVAL"}
        activeRoundId={activeRound?.id ?? null}
        menus={buildMenuOptions(menuData.menus)}
        categories={menuData.categories.map((category) => ({
          name: category.name,
          nameMy: category.nameMy,
        }))}
        openPlaceNotice={openPlaceNotice === "atTable" ? openPlaceNotice : null}
      />
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COUNTER_SESSION_COOKIE)?.value;

  const session = token
    ? await CounterSessionService.getActiveSessionByToken(token)
    : null;

  // With a session, trust its location (the customer can edit the query
  // param); only without one use the param.
  const effectiveLocationId = session ? session.locationId : locationId;

  // The online menu IS this page: with no QR session here it shows only
  // while the owner has it switched on (lib/storefront/menuAccess). The
  // server decides — "unavailable" loads and sends no menu data.
  if (
    effectiveLocationId === null ||
    (await checkMenuAccess(effectiveLocationId)) === "unavailable"
  ) {
    return <ShopUnavailable />;
  }

  const [menuData, shopName, bill] = await Promise.all([
    MenuService.getMenusForLocation(effectiveLocationId),
    LocationService.getShopNameForLocation(effectiveLocationId),
    // "Order More" can split one bill into several rounds — the
    // header shows the BILL's number (matches the cashier's Order
    // List card), never this particular round's own number.
    session ? CounterSessionService.getBillForSession(session) : null,
  ]);

  return (
    <CounterOrderClient
      hasSession={session !== null}
      locationId={effectiveLocationId}
      orderNumber={bill?.billNumber ?? ""}
      shopName={shopName}
      initialStatus={session?.status ?? "CART"}
      justScanned={scanned === "1"}
      // Only with an open bill to point at.
      openPlaceNotice={
        openPlaceNotice === "atCounter" && bill ? openPlaceNotice : null
      }
      menus={buildMenuOptions(menuData.menus)}
      categories={menuData.categories.map((category) => ({
        name: category.name,
        nameMy: category.nameMy,
      }))}
    />
  );
}
