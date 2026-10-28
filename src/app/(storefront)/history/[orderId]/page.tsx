import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { notFound } from "next/navigation";
import {
  CounterSessionService,
  TableDraftService,
  TableSessionService,
} from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/storefront/orderSessionCookie";
import { getContributorToken } from "@/app/lib/storefront/contributorToken";
import {
  cartLineTotal,
  orderLineTotal,
  orderLinesTotal,
} from "@/app/lib/order/orderTotals";
import {
  groupByContributor,
  type ContributorLabel,
} from "@/app/lib/order/contributors";
import {
  removedByStaff,
  toLabelledCartLine,
} from "@/app/lib/order/roundLine";
import { toLineAddons } from "@/app/lib/order/lineAddons";
import { mainImageUrl } from "@/app/lib/storage/assetUrl";
import {
  formatAddonSelections,
  localizeAddonSelections,
} from "@/app/lib/order/addonLabel";
import { effectiveQuantity } from "@/app/lib/order/voids";
import { customerRoundStatus } from "@/app/lib/order/cancelReason";
import OrderReceipt, {
  type ReceiptLine,
} from "@/app/components/orderUI/OrderReceipt";
import OrderMoreButton from "@/app/components/orderUI/OrderMoreButton";

// Same reasoning as /menu, /cart and /history — see those pages' comment.
export const dynamic = "force-dynamic";

/**
 * Receipt for one order (round) from /history. Order ids are sequential
 * integers, so the URL alone proves nothing: the viewer has to be
 * entitled to that specific round, checked the same two ways /history
 * scopes itself — Table QR (a valid contributor token for this tableId,
 * and the round must belong to that table) or Counter QR (the round
 * this browser's session cookie points at). Anything else is a 404
 * rather than an error, so a probing request can't tell "doesn't exist"
 * from "not yours".
 */
export default async function OrderReceiptPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ tableId?: string }>;
}) {
  const { orderId } = await params;
  const { tableId: tableIdParam } = await searchParams;

  const roundId = Number(orderId);
  if (!Number.isInteger(roundId) || roundId <= 0) notFound();

  const tableId = tableIdParam ? Number(tableIdParam) : null;

  let round: Awaited<
    ReturnType<typeof TableSessionService.getRoundDetailForTable>
  > = null;
  let isCounterRound = false;
  // Table QR still shows each round's own number (unchanged) — Counter
  // QR overrides this to the BILL's number below, matching the
  // cashier's Order List card and every other Counter customer screen.
  let orderNumber: string | null = null;
  // Table QR: who ordered which line (labels — never tokens).
  let labels: Map<number, ContributorLabel> | null = null;

  if (tableId) {
    const contributorToken = await getContributorToken(tableId);
    const isTokenCurrent =
      contributorToken !== null &&
      (await TableDraftService.isTokenCurrentForTable(
        tableId,
        contributorToken,
      ));
    if (contributorToken && isTokenCurrent) {
      [round, labels] = await Promise.all([
        TableSessionService.getRoundDetailForTable(tableId, roundId),
        TableDraftService.getContributorLabels(tableId, contributorToken),
      ]);
    }
  }

  if (!round) {
    // Counter QR (or a table link this browser was never let into).
    const cookieStore = await cookies();
    const token = cookieStore.get(COUNTER_SESSION_COOKIE)?.value;
    const session = token
      ? await CounterSessionService.getActiveSessionByToken(token)
      : null;
    if (!session) {
      notFound();
    }

    // Any round of THIS browser's current bill is viewable, not just
    // the one the cookie currently points at — "Order More" can split
    // one bill into several rounds (see OrderSession.billSessionId's
    // own schema comment), and /history now links to every one of
    // them (see getBillForSession), not just the newest.
    const bill = await CounterSessionService.getBillForSession(session, {
      includeWithdrawn: true,
    });
    const billRound = bill.rounds.find((candidate) => candidate.id === roundId);
    if (!billRound) {
      notFound();
    }
    round = billRound;
    isCounterRound = true;
    orderNumber = bill.billNumber;
  }

  // locationId comes from the round itself, not the URL, so the links
  // below can't be built from a missing or tampered query param.
  const query =
    isCounterRound || !tableId
      ? `locationId=${round.locationId}`
      : `locationId=${round.locationId}&tableId=${tableId}`;

  // Shop data (menu / add-on names) in the customer's language.
  const locale = await getLocale();

  const lines: ReceiptLine[] = round.orders.map((order) => ({
    id: order.id,
    menuName: localizedText(locale, order.menu.name, order.menu.nameMy),
    imageUrl: mainImageUrl(order.menu.menuImages),
    addonsText: formatAddonSelections(
      localizeAddonSelections(locale, toLineAddons(order.OrdersAddons)),
    ),
    note: order.note,
    // Staff-voided units left out; the receipt shows them struck through
    // with the reason only (removedByStaff — never who or the note).
    quantity: effectiveQuantity(order),
    total: orderLineTotal(order),
    removedByStaff: removedByStaff(order.voids),
  }));

  // Table QR: the same lines per person, each with its subtotal.
  const groups =
    !isCounterRound && labels
      ? groupByContributor(
          round.orders.map((order) => toLabelledCartLine(order, labels)),
        ).map((group) => ({
          key: group.key,
          who: group.who,
          subtotal: group.subtotal,
          lines: group.lines.map((line) => ({
            id: line.id,
            menuName: localizedText(locale, line.menuName, line.menuNameMy),
            imageUrl: line.imageUrl ?? null,
            addonsText: formatAddonSelections(
              localizeAddonSelections(locale, line.addons),
            ),
            note: line.note ?? null,
            quantity: line.quantity,
            total: cartLineTotal(line),
            removedByStaff: line.removedByStaff ?? null,
          })),
        }))
      : undefined;

  return (
    <OrderReceipt
      orderNumber={orderNumber ?? round.orderNumber}
      status={customerRoundStatus(round)}
      lines={lines}
      groups={groups}
      total={orderLinesTotal(round.orders)}
      backHref={`/history?${query}`}
      orderMore={
        <OrderMoreButton
          menuHref={`/menu?${query}`}
          startNewRound={isCounterRound}
        />
      }
    />
  );
}
