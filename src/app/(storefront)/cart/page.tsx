import { cookies } from "next/headers";
import Link from "next/link";
import { Box, Typography } from "@mui/material";
import {
  CartSubmitService,
  LocationService,
  OrderSessionService,
  TableDraftService,
} from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";
import { getContributorToken } from "@/app/lib/contributorToken";
import { toCartLine, toDraftLine } from "@/app/lib/roundLine";
import { orderLinesTotal } from "@/app/lib/orderTotals";
import { approvalTiming } from "@/app/lib/approvalTiming";
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
  searchParams: Promise<{
    locationId?: string;
    tableId?: string;
    scanned?: string;
  }>;
}) {
  const {
    locationId: locationIdParam,
    tableId: tableIdParam,
    scanned,
  } = await searchParams;
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
      const [draftItems, activeRound, shopName, shortages, rejectedRound] =
        await Promise.all([
          TableDraftService.getDraftItemsForTable(tableId),
          OrderSessionService.getActiveRoundWithOrdersForTable(tableId),
          LocationService.getShopNameForLocation(locationId),
          TableDraftService.getShortagesForTable(tableId, locationId),
          OrderSessionService.getRejectedRoundForTable(tableId),
        ]);

      return (
        <TableCartPageClient
          tableId={tableId}
          locationId={locationId}
          shopName={shopName}
          myContributorToken={contributorToken}
          initialDraftItems={draftItems.map(toDraftLine)}
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
          initialRoundItems={activeRound?.orders.map(toCartLine) ?? []}
          initialShortages={shortages}
          initialRejectedRound={rejectedRound}
        />
      );
    }
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(COUNTER_SESSION_COOKIE)?.value;

  const session = token
    ? await OrderSessionService.getActiveSessionByToken(token)
    : null;
  // The session's location when there is one (the query param could be
  // edited), otherwise the page's own — the browser cart is kept per
  // location, so one is needed to show it at all.
  const locationId = session?.locationId ?? Number(locationIdParam);

  if (!session && !(locationId > 0)) {
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

  const [shopName, sendState, bill] = await Promise.all([
    LocationService.getShopNameForLocation(locationId),
    // Read-only — the same answer every later cart check gives.
    CartSubmitService.getSendState(locationId, token ?? null),
    // "Order More" can split one bill into several rounds — the header
    // (and the Order-confirmed screen it feeds) shows the BILL's number,
    // matching the cashier's Order List card, never this round's own.
    session ? OrderSessionService.getBillForSession(session) : null,
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
