import { redirect } from "next/navigation";
import { OrderSessionApprovalService } from "@/app/services";
import { requireBackofficeContext } from "@/app/lib/backofficeContext";
import {
  buildEntryBillFromSessions,
  describeLineAddons,
} from "@/app/lib/orderTotals";
import OrderDetailView from "./OrderDetailView";

// Awaiting approval first (oldest first — closest to expiring), then everything else newest first.
function orderRoundsForDisplay<Round extends { id: number; status: string }>(
  rounds: Round[],
): Round[] {
  const isAwaitingApproval = (round: Round) =>
    round.status === "PENDING_APPROVAL";
  const awaitingApproval = rounds
    .filter(isAwaitingApproval)
    .sort((a, b) => a.id - b.id);
  const others = rounds
    .filter((round) => !isAwaitingApproval(round))
    .sort((a, b) => b.id - a.id);
  return [...awaitingApproval, ...others];
}

/** Full breakdown of one Order List card — a table's whole tab (every
 *  open round) or a single Counter order. `entryKey` is the same key
 *  groupSessionsForDisplay gives the card ("table-<id>" /
 *  "counter-<id>"). */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ entryKey: string }>;
}) {
  const { entryKey } = await params;

  const { context, fallback } = await requireBackofficeContext({
    signedOut: "Please sign in to view orders.",
  });
  if (!context) return fallback;
  const { location } = context;

  const entry = await OrderSessionApprovalService.getOpenEntry(
    location.locationId,
    entryKey,
  );

  // Paid, rejected or expired since the card was opened — nothing left
  // to show, so go back to the list rather than an empty page.
  if (!entry) redirect("/backoffice/order");

  // Dates cross the Server→Client boundary as ISO strings.
  const rounds = orderRoundsForDisplay(entry.sessions).map((session) => ({
    id: session.id,
    orderNumber: session.orderNumber,
    createdAt: session.createdAt.toISOString(),
    status: session.status,
    approvalExpiresAt: session.approvalExpiresAt?.toISOString() ?? null,
    itemCount: session.orders.reduce((sum, order) => sum + order.quantity, 0),
    lines: session.orders.map((order) => {
      const { variantText, extraNames } = describeLineAddons(order);
      return {
        id: order.id,
        quantity: order.quantity,
        menuName: order.menu.name,
        imageUrl: order.menu.assetUrl || null,
        variantText,
        addonNames: extraNames,
        note: order.note,
      };
    }),
  }));

  const firstRound = entry.sessions.reduce((oldest, session) =>
    session.id < oldest.id ? session : oldest,
  );

  return (
    <OrderDetailView
      title={entry.title}
      isTableGroup={entry.isTableGroup}
      entryKey={entry.key}
      startedAt={firstRound.createdAt.toISOString()}
      rounds={rounds}
      bill={buildEntryBillFromSessions(entry.sessions)}
      sessionIds={entry.sessions.map((session) => session.id)}
    />
  );
}
