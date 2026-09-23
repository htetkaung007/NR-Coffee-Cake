import { redirect } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { LocationService, OrderSessionApprovalService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import { orderLineTotal } from "@/app/lib/orderTotals";
import OrderDetailView from "./OrderDetailView";

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

  const { userId } = await getSessionContext();
  if (!userId) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Please sign in to view orders.
        </Typography>
      </Box>
    );
  }

  const selectedLocation = await LocationService.getSelectedLocation(userId);
  if (!selectedLocation) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          No location selected. Please choose a location first.
        </Typography>
      </Box>
    );
  }

  const entries = await OrderSessionApprovalService.getOpenEntries(
    selectedLocation.locationId,
  );
  const entry = entries.find((candidate) => candidate.key === entryKey);

  // Paid, rejected or expired since the card was opened — nothing left
  // to show, so go back to the list rather than an empty page.
  if (!entry) redirect("/backoffice/order");

  // Oldest round first (the service returns newest first) so the page
  // reads top to bottom like a bill, ending at the combined total.
  const rounds = [...entry.sessions]
    .sort((a, b) => a.id - b.id)
    .map((session) => ({
      id: session.id,
      orderNumber: session.orderNumber,
      createdAt: session.createdAt.toISOString(),
      status: session.status,
      approvalExpiresAt: session.approvalExpiresAt?.toISOString() ?? null,
      total: session.total,
      lines: session.orders.map((order) => ({
        id: order.id,
        quantity: order.quantity,
        menuName: order.menu.name,
        addonNames: order.OrdersAddons.map((link) => link.addon.name),
        note: order.note,
        price: orderLineTotal(order),
      })),
    }));

  return (
    <OrderDetailView
      title={entry.title}
      isTableGroup={entry.isTableGroup}
      combinedTotal={entry.combinedTotal}
      rounds={rounds}
    />
  );
}
