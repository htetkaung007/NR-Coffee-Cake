import { cookies } from "next/headers";
import Link from "next/link";
import { Box, Stack, Typography } from "@mui/material";
import {
  LocationService,
  OrderSessionService,
  TableDraftService,
} from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";
import { getContributorToken } from "@/app/lib/contributorToken";
import { orderLinesTotal } from "@/app/lib/orderTotals";
import OrderTopBar from "@/app/components/orderUI/OrderTopBar";
import OrderHistoryCard from "@/app/components/orderUI/OrderHistoryCard";
import BackCircleButton from "@/app/components/orderUI/BackCircleButton";

// Same reasoning as /menu and /cart — see those pages' own comment.
export const dynamic = "force-dynamic";

/**
 * Read-only "what have I ordered so far" screen for a customer still
 * waiting to pay — reachable from the bottom bar's History tab (see
 * OrderBotBar).
 *
 * Branches the same way /menu and /cart do: a tableId with a matching
 * contributorToken means Table QR, where "history" is every round
 * already sent to the kitchen for this table's still-open tab (see
 * OrderSessionService.getRoundHistoryForTable — that's exactly the set
 * markSessionsPaid later settles together in one bill, so this is the
 * customer's own running total so far). Everything else falls through
 * to Counter QR, where "Order More" rounds are deliberately never
 * merged into one bill (see groupSessionsForDisplay's own comment) —
 * the browser's cookie only ever points at the one round it's
 * currently in, so that's the only round there is to show.
 */
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string; tableId?: string }>;
}) {
  const { locationId: locationIdParam, tableId: tableIdParam } =
    await searchParams;
  const tableId = tableIdParam ? Number(tableIdParam) : null;
  const backHref = tableId
    ? `/menu?locationId=${locationIdParam}&tableId=${tableId}`
    : locationIdParam
      ? `/menu?locationId=${locationIdParam}`
      : "/menu";

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
      const [rounds, shopName] = await Promise.all([
        OrderSessionService.getRoundHistoryForTable(tableId),
        LocationService.getShopNameForLocation(locationId),
      ]);
      // Every round listed below — the same set markSessionsPaid later
      // settles as one bill — so the sticky total always equals the sum
      // of the cards above it.
      const tableTotal = rounds.reduce(
        (sum, round) => sum + orderLinesTotal(round.orders),
        0,
      );

      return (
        <Box
          sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}
        >
          <OrderTopBar shopName={shopName} cartItemCount={0} />
          <Box
            sx={{
              flex: 1,
              width: "100%",
              p: { xs: 2, sm: 3 },
              maxWidth: 720,
              mx: "auto",
            }}
          >
            <Stack
              direction="row"
              spacing={1.5}
              sx={{ alignItems: "center", mb: 2 }}
            >
              <BackCircleButton href={backHref} ariaLabel="Back to menu" />
              <Typography variant="h6">Order history</Typography>
            </Stack>

            {rounds.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nothing sent to the kitchen yet — items you send to the kitchen
                will show up here until the table is settled.
              </Typography>
            ) : (
              <Stack spacing={{ xs: 1.5, sm: 2 }}>
                {rounds.map((round) => (
                  <OrderHistoryCard
                    key={round.id}
                    href={`/history/${round.id}?locationId=${round.locationId}&tableId=${tableId}`}
                    orderNumber={round.orderNumber}
                    status={round.status}
                    items={round.orders.map((order) => ({
                      quantity: order.quantity,
                      name: order.menu.name,
                    }))}
                    total={orderLinesTotal(round.orders)}
                  />
                ))}
              </Stack>
            )}
          </Box>

          {rounds.length > 0 && (
            <Box
              sx={{
                position: "sticky",
                bottom: 0,
                zIndex: 1,
                bgcolor: "background.paper",
                borderTop: "1px solid",
                borderColor: "divider",
                px: { xs: 2, sm: 3 },
                pt: 1.5,
                pb: "calc(12px + env(safe-area-inset-bottom, 0px))",
              }}
            >
              <Stack
                direction="row"
                sx={{
                  maxWidth: 720,
                  mx: "auto",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 800 }}>
                    Table total
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {rounds.length} {rounds.length === 1 ? "order" : "orders"}
                  </Typography>
                </Box>
                <Typography
                  variant="body1"
                  sx={{ fontWeight: 800, fontSize: "1.1rem", color: "primary.main" }}
                >
                  {tableTotal.toLocaleString()} MMK
                </Typography>
              </Stack>
            </Box>
          )}
        </Box>
      );
    }
  }

  // Counter QR (or a table link this browser was never let into, same
  // as /cart's own fall-through) — resolved from the session cookie.
  const cookieStore = await cookies();
  const token = cookieStore.get(COUNTER_SESSION_COOKIE)?.value;
  const session = token
    ? await OrderSessionService.getActiveSessionByToken(token)
    : null;

  if (!session || session.status === "CART") {
    return (
      <Box sx={{ minHeight: "100vh" }}>
        <OrderTopBar shopName={null} cartItemCount={0} />
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: "auto" }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            No order history
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {session
              ? "Submit your order first — it'll show up here once it's sent to the kitchen."
              : "You don't have an active order yet. Scan the table or counter QR to start one."}
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

  const shopName = await LocationService.getShopNameForLocation(
    session.locationId,
  );
  const total = orderLinesTotal(session.orders);

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <OrderTopBar shopName={shopName} cartItemCount={0} />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: "auto" }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", mb: 2 }}
        >
          <BackCircleButton
            href={`/menu?locationId=${session.locationId}`}
            ariaLabel="Back to menu"
          />
          <Typography variant="h6">Order history</Typography>
        </Stack>

        <OrderHistoryCard
          href={`/history/${session.id}?locationId=${session.locationId}`}
          orderNumber={session.orderNumber}
          status={session.status}
          items={session.orders.map((order) => ({
            quantity: order.quantity,
            name: order.menu.name,
          }))}
          total={total}
        />
      </Box>
    </Box>
  );
}
