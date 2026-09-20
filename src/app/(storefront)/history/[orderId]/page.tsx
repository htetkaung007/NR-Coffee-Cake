import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { OrderSessionService, TableDraftService } from "@/app/services";
import { COUNTER_SESSION_COOKIE } from "@/app/lib/orderSessionCookie";
import { getContributorToken } from "@/app/lib/contributorToken";
import { orderLineTotal, orderLinesTotal } from "@/app/lib/orderTotals";
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
    ReturnType<typeof OrderSessionService.getRoundDetailForTable>
  > = null;
  let isCounterRound = false;

  if (tableId) {
    const contributorToken = await getContributorToken(tableId);
    const isTokenCurrent =
      contributorToken !== null &&
      (await TableDraftService.isTokenCurrentForTable(
        tableId,
        contributorToken,
      ));
    if (contributorToken && isTokenCurrent) {
      round = await OrderSessionService.getRoundDetailForTable(
        tableId,
        roundId,
      );
    }
  }

  if (!round) {
    // Counter QR (or a table link this browser was never let into).
    const cookieStore = await cookies();
    const token = cookieStore.get(COUNTER_SESSION_COOKIE)?.value;
    const session = token
      ? await OrderSessionService.getActiveSessionByToken(token)
      : null;
    if (!session || session.id !== roundId || session.status === "CART") {
      notFound();
    }
    round = session;
    isCounterRound = true;
  }

  // locationId comes from the round itself, not the URL, so the links
  // below can't be built from a missing or tampered query param.
  const query =
    isCounterRound || !tableId
      ? `locationId=${round.locationId}`
      : `locationId=${round.locationId}&tableId=${tableId}`;

  const lines: ReceiptLine[] = round.orders.map((order) => ({
    id: order.id,
    menuName: order.menu.name,
    imageUrl: order.menu.assetUrl,
    addonNames: order.OrdersAddons.map((link) => link.addon.name),
    note: order.note,
    quantity: order.quantity,
    total: orderLineTotal(order),
  }));

  return (
    <OrderReceipt
      orderNumber={round.orderNumber}
      status={round.status}
      lines={lines}
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
