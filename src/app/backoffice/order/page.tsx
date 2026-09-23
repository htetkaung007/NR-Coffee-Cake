import { Box, Typography } from "@mui/material";
import { LocationService, OrderSessionApprovalService } from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import OrderListView from "./orderListView";

export default async function OrderPage() {
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

  // The list only needs each round's id (Mark-as-Paid settles them
  // together) — the items live on the entry's detail page — so don't
  // ship every order line to the browser on each 5-second refresh.
  const listEntries = entries.map((entry) => ({
    key: entry.key,
    title: entry.title,
    isTableGroup: entry.isTableGroup,
    hasPendingApproval: entry.hasPendingApproval,
    combinedTotal: entry.combinedTotal,
    sessions: entry.sessions.map((session) => ({ id: session.id })),
  }));

  return <OrderListView entries={listEntries} />;
}
