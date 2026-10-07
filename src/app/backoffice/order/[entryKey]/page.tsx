import { redirect } from "next/navigation";
import { OrderSessionApprovalService } from "@/app/services";
import { approvalDeadline } from "@/app/lib/approvalDeadline";
import { requireBackofficeContext } from "@/app/lib/backofficeContext";
import { buildEntryBillFromSessions } from "@/app/lib/orderTotals";
import { mergeLinesForDisplay } from "@/app/lib/orderLineMerge";
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
function approvalDueFor(session: {
  status: string;
  isCounter: boolean;
  createdAt: Date;
  approvalExpiresAt: Date | null;
}) {
  const due = approvalDeadline(session);
  return due
    ? { at: due.deadline.toISOString(), autoCancels: due.autoCancels }
    : null;
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ entryKey: string }>;
}) {
  const { entryKey } = await params;

  const { context, fallback } = await requireBackofficeContext({
    signedOut: "Please sign in to view orders.",
    access: "staff",
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
    // When it's due (approvalDeadline): Counter auto-cancels then; a
    // Table round only becomes overdue.
    approvalDue: approvalDueFor(session),
    itemCount: session.orders.reduce((sum, order) => sum + order.quantity, 0),
    // Identical lines from different customers shown as one ("Iced Latte
    // ×2") — display only; the Backoffice never shows who ordered what.
    lines: mergeLinesForDisplay(session.orders).map((order) => ({
      id: order.id,
      quantity: order.quantity,
      menuName: order.menu.name,
      imageUrl: order.menu.assetUrl || null,
      addonNames: order.OrdersAddons.map((link) => link.addon.name),
      note: order.note,
    })),
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
