import { OrderSessionApprovalService } from "@/app/services";
import { requireBackofficeContext } from "@/app/lib/backofficeContext";
import OrderListView from "./OrderListView";

export default async function OrderPage() {
  const { context, fallback } = await requireBackofficeContext({
    signedOut: "Please sign in to view orders.",
  });
  if (!context) return fallback;
  const { location } = context;

  const entries = await OrderSessionApprovalService.getOpenEntries(
    location.locationId,
  );

  // The list only needs each round's id (Mark-as-Paid settles them
  // together) and status — the items live on the entry's detail page —
  // so don't ship every order line to the browser on each 5-second
  // refresh. Dates cross the Server→Client boundary as ISO strings.
  const listEntries = entries.map((entry) => ({
    key: entry.key,
    title: entry.title,
    isTableGroup: entry.isTableGroup,
    hasPendingApproval: entry.hasPendingApproval,
    earliestApprovalExpiresAt:
      entry.earliestApprovalExpiresAt?.toISOString() ?? null,
    combinedTotal: entry.combinedTotal,
    sessions: entry.sessions.map((session) => ({
      id: session.id,
      status: session.status,
    })),
  }));

  return <OrderListView entries={listEntries} />;
}
