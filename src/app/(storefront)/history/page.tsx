import { cookies } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { localizedText } from "@/app/lib/i18n/localizedText";
import Link from "next/link";
import { Box, Stack, Typography } from "@mui/material";
import {
  CounterSessionService,
  LocationService,
  TableDraftService,
  TableSessionService,
} from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/storefront/orderSessionCookie";
import { getContributorToken } from "@/app/lib/storefront/contributorToken";
import { cartLinesTotal, orderLinesTotal } from "@/app/lib/order/orderTotals";
import { effectiveQuantity, voidedQuantity } from "@/app/lib/order/voids";
import { customerRoundStatus } from "@/app/lib/order/cancelReason";
import { groupByContributor } from "@/app/lib/order/contributors";
import { toLabelledCartLine } from "@/app/lib/order/roundLine";
import { formatAmountParts } from "@/app/lib/orderFormat";
import OrderTopBar from "@/app/components/orderUI/OrderTopBar";
import OrderHistoryCard from "@/app/components/orderUI/OrderHistoryCard";
import HistoryTotalCard from "@/app/components/orderUI/HistoryTotalCard";
import BackCircleButton from "@/app/components/orderUI/BackCircleButton";
import { BOTTOM_BAR_CLEARANCE } from "@/app/lib/storefront/bottomBarLayout";

// Same reasoning as /menu and /cart — see those pages' own comment.
export const dynamic = "force-dynamic";

/**
 * Read-only "what have I ordered so far" screen for a customer still
 * waiting to pay — reachable from the bottom bar's History tab (see
 * OrderBotBar, mounted in the storefront layout).
 *
 * Branches the same way /menu and /cart do: a tableId with a matching
 * contributorToken means Table QR, where "history" is every round
 * already sent to the kitchen for this table's still-open tab (see
 * TableSessionService.getRoundHistoryForTable — that's exactly the set
 * markSessionsPaid later settles together in one bill, so this is the
 * customer's own running total so far). Everything else falls through
 * to Counter QR, where "Order More" can split one bill into several
 * rounds too (see OrderSession.billSessionId's own schema comment) —
 * CounterSessionService.getBillForSession is Counter's counterpart to
 * getRoundHistoryForTable, walking billSessionId instead of tableId.
 */
export default async function HistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ locationId?: string; tableId?: string }>;
}) {
  const { locationId: locationIdParam, tableId: tableIdParam } =
    await searchParams;
  const t = await getTranslations("history");
  // Shop data (menu names) in the customer's language.
  const locale = await getLocale();
  const tCommon = await getTranslations("common");
  // Customer prices: "4,500 Kyats" / "4,500 ကျပ်" — never "MMK".
  const price = (amount: number) =>
    tCommon("price", { amount: formatAmountParts(amount).value });
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
      const [rounds, shopName, labels] = await Promise.all([
        TableSessionService.getRoundHistoryForTable(tableId),
        LocationService.getShopNameForLocation(locationId),
        // Who's who as labels — the tokens stay on the server.
        TableDraftService.getContributorLabels(tableId, contributorToken),
      ]);
      // Each round's lines, labelled — then per person on each card.
      const labelledRounds = rounds.map((round) => ({
        round,
        lines: round.orders.map((order) => toLabelledCartLine(order, labels)),
      }));
      // A round a customer withdrew is listed but never charged.
      const chargedRounds = labelledRounds.filter(
        ({ round }) => round.status !== "CANCELLED",
      );
      // Display only: payment is still ONE bill for the whole table.
      const myTotal = cartLinesTotal(
        chargedRounds.flatMap(({ lines }) =>
          lines.filter((line) => line.isMine),
        ),
      );
      // Every round listed below — the same set markSessionsPaid later
      // settles as one bill — so the total card always equals the sum
      // of the cards above it.
      const tableTotal = chargedRounds.reduce(
        (sum, { round }) => sum + orderLinesTotal(round.orders),
        0,
      );

      return (
        <Box
          sx={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            // The floating bottom bar's room.
            pb: BOTTOM_BAR_CLEARANCE,
          }}
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
              <BackCircleButton
                href={backHref}
                ariaLabel={tCommon("backToMenu")}
              />
              <Typography variant="h6">{t("title")}</Typography>
            </Stack>

            {rounds.length === 0 ? (
              <Typography variant="body2" color="text.secondary">
                {t("emptyTable")}
              </Typography>
            ) : (
              <>
                {/* Display only — the table still pays one bill. */}
                <HistoryTotalCard
                  label={t("tableTotal")}
                  detail={`${t("orderCount", { count: rounds.length })} · ${t("yourTotal", { amount: price(myTotal) })}`}
                  amount={price(tableTotal)}
                />
                <Stack spacing={{ xs: 1.5, sm: 2 }}>
                  {labelledRounds.map(({ round, lines }) => (
                    <OrderHistoryCard
                      key={round.id}
                      href={`/history/${round.id}?locationId=${round.locationId}&tableId=${tableId}`}
                      orderNumber={round.orderNumber}
                      status={customerRoundStatus(round)}
                      items={lines.map((line) => ({
                        quantity: line.quantity,
                        name: localizedText(
                          locale,
                          line.menuName,
                          line.menuNameMy,
                        ),
                        removed: line.removedByStaff?.quantity ?? 0,
                      }))}
                      groups={groupByContributor(lines).map((group) => ({
                        key: group.key,
                        who: group.who,
                        items: group.lines.map((line) => ({
                          quantity: line.quantity,
                          name: localizedText(
                            locale,
                            line.menuName,
                            line.menuNameMy,
                          ),
                          removed: line.removedByStaff?.quantity ?? 0,
                        })),
                        subtotal: group.subtotal,
                      }))}
                      total={orderLinesTotal(round.orders)}
                    />
                  ))}
                </Stack>
              </>
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
    ? await CounterSessionService.getActiveSessionByToken(token)
    : null;

  if (!session || session.status === "CART") {
    return (
      <Box sx={{ minHeight: "100dvh", pb: BOTTOM_BAR_CLEARANCE }}>
        <OrderTopBar shopName={null} cartItemCount={0} />
        <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: "auto" }}>
          <Typography variant="h6" sx={{ mb: 1 }}>
            {t("noHistoryTitle")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {session ? t("noHistorySubmitFirst") : t("noHistoryNoOrder")}
          </Typography>
          <Link href={backHref} style={{ color: "inherit" }}>
            <Typography variant="body2" sx={{ textDecoration: "underline" }}>
              {tCommon("backToMenu")}
            </Typography>
          </Link>
        </Box>
      </Box>
    );
  }

  const [shopName, bill] = await Promise.all([
    LocationService.getShopNameForLocation(session.locationId),
    CounterSessionService.getBillForSession(session, {
      includeWithdrawn: true,
    }),
  ]);

  return (
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        // The floating bottom bar's room.
        pb: BOTTOM_BAR_CLEARANCE,
      }}
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
          <BackCircleButton
            href={`/menu?locationId=${session.locationId}`}
            ariaLabel={tCommon("backToMenu")}
          />
          <Box>
            <Typography variant="h6">{t("title")}</Typography>
            <Typography variant="caption" color="text.secondary">
              {bill.billNumber}
            </Typography>
          </Box>
        </Stack>

        {bill.rounds.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            {t("emptyCounter")}
          </Typography>
        ) : (
          <>
            <HistoryTotalCard
              label={bill.billNumber}
              detail={t("roundCount", { count: bill.rounds.length })}
              amount={price(bill.combinedTotal)}
            />
            <Stack spacing={{ xs: 1.5, sm: 2 }}>
              {bill.rounds.map((round, index) => (
                <OrderHistoryCard
                  key={round.id}
                  href={`/history/${round.id}?locationId=${round.locationId}`}
                  orderNumber={t("round", { number: index + 1 })}
                  status={customerRoundStatus(round)}
                  items={round.orders.map((order) => ({
                    // Staff-voided units left out (lib/order/voids).
                    quantity: effectiveQuantity(order),
                    name: localizedText(
                      locale,
                      order.menu.name,
                      order.menu.nameMy,
                    ),
                    removed: voidedQuantity(order.voids),
                  }))}
                  total={orderLinesTotal(round.orders)}
                />
              ))}
            </Stack>
          </>
        )}
      </Box>
    </Box>
  );
}
