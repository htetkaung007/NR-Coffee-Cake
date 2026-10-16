import { cookies } from "next/headers";
import {
  CartSubmitService,
  CounterSessionService,
  LocationService,
  TableDraftService,
  TableSessionService,
} from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/storefront/orderSessionCookie";
import {
  toCartLine,
  toDraftLine,
  toLabelledCartLine,
} from "@/app/lib/order/roundLine";
import { orderLinesTotal } from "@/app/lib/order/orderTotals";
import { approvalTiming } from "@/app/lib/approval/approvalTiming";
import CartPageClient from "@/app/components/orderUI/CartPageClient";
import TableCartPageClient from "@/app/components/orderUI/TableCartPageClient";
import { CartButtonStatus } from "@/app/components/orderUI/CartButton";
import ShopUnavailable from "@/app/components/orderUI/ShopUnavailable";
import { readTableSessionPlace } from "@/app/lib/storefront/tableSessionAccess";
import { checkMenuAccess } from "@/app/lib/storefront/menuAccessCheck";

// Same reasoning as /menu — see that page's dynamic export comment.
export const dynamic = "force-dynamic";

/**
 * Its own route (not a section within /menu) — per design feedback,
 * the cart is somewhere the customer navigates TO (via the top bar's
 * cart icon), not a block that lives inline below the menu grid.
 *
 * Branches the same way /menu does: a tableId with a matching
 * contributorToken (see contributorToken.ts) means Table QR's shared-
 * draft review (TableCartPageClient); everything else falls through
 * to Counter QR's own session-based review (CartPageClient), same as
 * before the per-customer draft redesign.
 *
 * A visitor with no session (browsing online — never scanned a
 * table/counter QR) is NOT an error case: the cart icon is always
 * visible in the top bar, so this page has to make sense for them too.
 * It follows the menu-access rule (lib/storefront/menuAccess): their
 * browser cart shows while the online menu is on; with it off, or with
 * no valid location at all, it's the "shop is unavailable" screen.
 */
export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{
    locationId?: string;
    tableId?: string;
    scanned?: string;
  }>;
}) {
  const { scanned, ...ids } = await searchParams;
  // Untrusted URL ids, and this browser's Table QR session there if any
  // (lib/storefront/tableSessionAccess).
  const { urlLocationId, table } = await readTableSessionPlace(ids);

  if (table) {
    const { tableId, locationId, contributorToken } = table;
    // Scanned in — unless the location is gone or closed.
    if ((await checkMenuAccess(locationId)) === "unavailable") {
      return <ShopUnavailable />;
    }
    const [
      draftItems,
      activeRound,
      shopName,
      shortages,
      rejectedRound,
      labels,
      tableName,
    ] = await Promise.all([
      TableDraftService.getDraftItemsForTable(tableId),
      TableSessionService.getActiveRoundWithOrdersForTable(tableId),
      LocationService.getShopNameForLocation(locationId),
      TableDraftService.getShortagesForTable(tableId, locationId),
      TableSessionService.getRejectedRoundForTable(tableId),
      // Who's who as labels — the tokens stay on the server.
      TableDraftService.getContributorLabels(tableId, contributorToken),
      TableSessionService.getTableName(tableId, locationId),
    ]);

    return (
      <TableCartPageClient
        tableId={tableId}
        tableName={tableName}
        locationId={locationId}
        shopName={shopName}
        initialDraftItems={draftItems.map((item) => toDraftLine(item, labels))}
        initialActiveRound={
          activeRound
            ? {
                id: activeRound.id,
                orderNumber: activeRound.orderNumber,
                status: activeRound.status,
                total: orderLinesTotal(activeRound.orders),
                // The soft countdown — never auto-cancels for a Table
                // round (see approvalDeadline).
                approval: approvalTiming(activeRound, new Date()),
              }
            : null
        }
        initialRoundItems={
          activeRound?.orders.map((order) =>
            toLabelledCartLine(order, labels),
          ) ?? []
        }
        initialShortages={shortages}
        initialRejectedRound={rejectedRound}
      />
    );
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COUNTER_SESSION_COOKIE)?.value;

  const session = token
    ? await CounterSessionService.getActiveSessionByToken(token)
    : null;
  // The session's location when there is one (the query param could be
  // edited), otherwise the page's own — the browser cart is kept per
  // location, so one is needed to show it at all.
  const locationId = session?.locationId ?? urlLocationId;

  // The browser cart shows menu names and prices: the menu-access rule
  // applies (online menu off + no QR session here → unavailable).
  if (
    locationId === null ||
    (await checkMenuAccess(locationId)) === "unavailable"
  ) {
    return <ShopUnavailable />;
  }

  const [shopName, sendState, bill] = await Promise.all([
    LocationService.getShopNameForLocation(locationId),
    // Read-only — the same answer every later cart check gives.
    CartSubmitService.getSendState(locationId, token ?? null),
    // "Order More" can split one bill into several rounds — the header
    // (and the Order-confirmed screen it feeds) shows the BILL's number,
    // matching the cashier's Order List card, never this round's own.
    session ? CounterSessionService.getBillForSession(session) : null,
  ]);

  return (
    <CartPageClient
      // A new round or status from the server (after a submit's refresh)
      // starts the page fresh from it.
      key={session ? `${session.id}:${session.status}` : "no-session"}
      locationId={locationId}
      shopName={shopName}
      initialSendState={sendState}
      justScanned={scanned === "1"}
      session={
        session && bill
          ? {
              id: session.id,
              status: session.status as CartButtonStatus,
              billNumber: bill.billNumber,
              // A CART round's rows are the old server-held cart — the
              // cart is in the browser now, so they're not shown.
              roundLines:
                session.status === "CART" ? [] : session.orders.map(toCartLine),
              roundTotal:
                session.status === "CART" ? 0 : orderLinesTotal(session.orders),
              // getBillForSession's rounds are the submitted ones only.
              hasEarlierRound: bill.rounds.length > 0,
              // Time left to confirm, on the SERVER's clock.
              approval: approvalTiming(session, new Date()),
            }
          : null
      }
    />
  );
}
