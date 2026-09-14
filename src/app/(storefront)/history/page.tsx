import { cookies } from "next/headers";
import Link from "next/link";
import {
  Box,
  Card,
  Chip,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  LocationService,
  OrderSessionService,
  TableDraftService,
} from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";
import { getContributorToken } from "@/app/lib/contributorToken";
import OrderTopBar from "@/app/components/orderUI/OrderTopBar";
import { ROUND_STATUS_LABEL } from "@/app/components/orderUI/ActiveRoundBanner";

// Same reasoning as /menu and /cart — see those pages' own comment.
export const dynamic = "force-dynamic";

function roundChipColor(status: string) {
  return status === "PENDING_APPROVAL" ? "default" : "success";
}

/**
 * Read-only "what have I ordered so far" screen for a customer still
 * waiting to pay — reachable from the top bar's history icon (see
 * OrderTopBar's onHistoryClick).
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

      return (
        <Box sx={{ minHeight: "100vh" }}>
          <OrderTopBar shopName={shopName} cartItemCount={0} />
          <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: "auto" }}>
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: "center", mb: 2 }}
            >
              <Link
                href={backHref}
                style={{ color: "inherit", display: "flex" }}
              >
                <IconButton size="small" aria-label="Back to menu">
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              </Link>
              <Typography variant="h6">Order history</Typography>
            </Stack>

            {rounds.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                Nothing sent to the kitchen yet — items you send to the kitchen
                will show up here until the table is settled.
              </Typography>
            ) : (
              <Stack spacing={1.5}>
                {rounds.map((round) => {
                  const total = round.orders.reduce(
                    (sum, order) => sum + order.menu.price * order.quantity,
                    0,
                  );
                  return (
                    <Card key={round.id} variant="outlined" sx={{ p: 1.5 }}>
                      <Stack
                        direction="row"
                        sx={{ justifyContent: "space-between", mb: 1 }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ alignItems: "center" }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {round.orderNumber}
                          </Typography>
                          <Chip
                            size="small"
                            label={
                              ROUND_STATUS_LABEL[round.status] ?? round.status
                            }
                            color={roundChipColor(round.status)}
                          />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                          {total.toLocaleString()} MMK
                        </Typography>
                      </Stack>
                      <Divider sx={{ mb: 1 }} />
                      <Stack spacing={0.75}>
                        {round.orders.map((order) => {
                          const addonNames = order.OrdersAddons.map(
                            (link) => link.addon.name,
                          );
                          return (
                            <Box key={order.id}>
                              <Stack
                                direction="row"
                                sx={{ justifyContent: "space-between" }}
                              >
                                <Typography variant="body2">
                                  {order.quantity} × {order.menu.name}
                                </Typography>
                                <Typography variant="body2">
                                  {(
                                    order.menu.price * order.quantity
                                  ).toLocaleString()}{" "}
                                  MMK
                                </Typography>
                              </Stack>
                              {addonNames.length > 0 && (
                                <Typography
                                  variant="caption"
                                  color="text.secondary"
                                >
                                  + {addonNames.join(", ")}
                                </Typography>
                              )}
                            </Box>
                          );
                        })}
                      </Stack>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Box>
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
  const total = session.orders.reduce(
    (sum, order) => sum + order.menu.price * order.quantity,
    0,
  );

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <OrderTopBar shopName={shopName} cartItemCount={0} />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: "auto" }}>
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: "center", mb: 2 }}
        >
          <Link
            href={`/menu?locationId=${session.locationId}`}
            style={{ color: "inherit", display: "flex" }}
          >
            <IconButton size="small" aria-label="Back to menu">
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          </Link>
          <Typography variant="h6">Order history</Typography>
        </Stack>

        <Card variant="outlined" sx={{ p: 1.5 }}>
          <Stack
            direction="row"
            sx={{ justifyContent: "space-between", mb: 1 }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {session.orderNumber}
              </Typography>
              <Chip
                size="small"
                label={ROUND_STATUS_LABEL[session.status] ?? session.status}
                color={roundChipColor(session.status)}
              />
            </Stack>
            <Typography variant="body2" color="text.secondary">
              {total.toLocaleString()} MMK
            </Typography>
          </Stack>
          <Divider sx={{ mb: 1 }} />
          <Stack spacing={0.75}>
            {session.orders.map((order) => (
              <Stack
                key={order.id}
                direction="row"
                sx={{ justifyContent: "space-between" }}
              >
                <Typography variant="body2">
                  {order.quantity} × {order.menu.name}
                </Typography>
                <Typography variant="body2">
                  {(order.menu.price * order.quantity).toLocaleString()} MMK
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Card>
      </Box>
    </Box>
  );
}
