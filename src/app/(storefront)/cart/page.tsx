import { cookies } from "next/headers";
import Link from "next/link";
import { Box, Typography } from "@mui/material";
import {
  LocationService,
  OrderSessionService,
  TableDraftService,
} from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";
import { getContributorToken } from "@/app/lib/contributorToken";
import { toCartLine } from "@/app/lib/roundLine";
import { orderLinesTotal } from "@/app/lib/orderTotals";
import CartPageClient from "@/app/components/orderUI/CartPageClient";
import TableCartPageClient from "@/app/components/orderUI/TableCartPageClient";
import OrderTopBar from "@/app/components/orderUI/OrderTopBar";
import { CartButtonStatus } from "@/app/components/orderUI/CartButton";

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
 * A visitor with neither a session nor a table draft to look at
 * (someone just browsing online — never scanned a table/counter QR)
 * is NOT an error case: the cart icon is always visible in the top
 * bar regardless of hasSession (see CounterOrderClient.tsx), so this
 * page has to make sense for that visitor too. It gets a plain "No
 * order yet" message here instead of redirecting — a redirect back to
 * /menu with no locationId to carry over previously produced a broken
 * page (MenuService queried with an invalid id).
 */
export default async function CartPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string; tableId?: string }>;
}) {
  const { locationId: locationIdParam, tableId: tableIdParam } =
    await searchParams;
  const tableId = tableIdParam ? Number(tableIdParam) : null;

  if (tableId) {
    const contributorToken = await getContributorToken(tableId);
    const isTokenCurrent =
      contributorToken !== null &&
      (await TableDraftService.isTokenCurrentForTable(
        tableId,
        contributorToken,
      ));
    if (contributorToken && isTokenCurrent) {
      const locationId = Number(locationIdParam);
      const [draftItems, activeRound, shopName, shortages] = await Promise.all([
        TableDraftService.getDraftItemsForTable(tableId),
        OrderSessionService.getActiveRoundWithOrdersForTable(tableId),
        LocationService.getShopNameForLocation(locationId),
        TableDraftService.getShortagesForTable(tableId, locationId),
      ]);

      return (
        <TableCartPageClient
          tableId={tableId}
          locationId={locationId}
          shopName={shopName}
          myContributorToken={contributorToken}
          initialDraftItems={draftItems.map((item) => ({
            id: item.id,
            menuId: item.menuId,
            menuName: item.menu.name,
            quantity: item.quantity,
            price: item.menu.price,
            contributorToken: item.contributorToken ?? "",
            addonNames: item.OrdersAddons.map((link) => link.addon.name),
            addonIds: item.OrdersAddons.map((link) => link.addonId),
            imageUrl: item.menu.assetUrl,
            note: item.note,
          }))}
          initialActiveRound={
            activeRound
              ? {
                  id: activeRound.id,
                  orderNumber: activeRound.orderNumber,
                  status: activeRound.status,
                  total: orderLinesTotal(activeRound.orders),
                }
              : null
          }
          initialRoundItems={activeRound?.orders.map(toCartLine) ?? []}
          initialShortages={shortages}
        />
      );
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COUNTER_SESSION_COOKIE)?.value;

  const session = token
    ? await OrderSessionService.getActiveSessionByToken(token)
    : null;

  if (!session) {
    const backHref = tableId
      ? `/menu?locationId=${locationIdParam}&tableId=${tableId}`
      : locationIdParam
        ? `/menu?locationId=${locationIdParam}`
        : "/menu";
    return (
      <Box sx={{ minHeight: "100vh" }}>
        <OrderTopBar shopName={null} cartItemCount={0} />
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: "auto" }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            No order
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            You don&apos;t have an active order yet. Scan the table or counter
            QR to start one.
          </Typography>
          <Link href={backHref} style={{ color: "inherit" }}>
            <Typography variant="body2" sx={{ textDecoration: "underline" }}>
              Back to menu
            </Typography>
          </Link>
        </Box>
      </Box>
    );
  }

  const [shopName, shortages, bill] = await Promise.all([
    LocationService.getShopNameForLocation(session.locationId),
    OrderSessionService.getShortagesForSession(session.id, session.locationId),
    // "Order More" can split one bill into several rounds — the
    // header (and the Order-confirmed screen it feeds) shows the
    // BILL's number, matching the cashier's Order List card, never
    // this particular round's own number.
    OrderSessionService.getBillForSession(session),
  ]);

  return (
    <CartPageClient
      sessionId={session.id}
      initialTotal={orderLinesTotal(session.orders)}
      locationId={session.locationId}
      orderNumber={bill.billNumber}
      shopName={shopName}
      initialStatus={session.status as CartButtonStatus}
      // getBillForSession's rounds filter excludes CART, so while this
      // round IS the CART round, any round still in `bill.rounds` is
      // an earlier one already with the kitchen (see
      // OrderSessionService.getOrStartCartRound — this only happens
      // once the accepted round's next round has been started).
      hasEarlierRound={session.status === "CART" && bill.rounds.length > 0}
      initialShortages={shortages}
      initialCart={session.orders.map((order) => ({
        id: order.id,
        menuId: order.menuId,
        menuName: order.menu.name,
        quantity: order.quantity,
        price: order.menu.price,
        addonNames: order.OrdersAddons.map((link) => link.addon.name),
        addonIds: order.OrdersAddons.map((link) => link.addonId),
        imageUrl: order.menu.assetUrl,
        note: order.note,
      }))}
    />
  );
}
