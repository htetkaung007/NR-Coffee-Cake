import { Box, Typography } from "@mui/material";
import { AppService, OrderSessionService } from "@/app/services";
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

  const selectedLocation = await AppService.getSelectedLocation(userId);
  if (!selectedLocation) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="text.secondary">
          No location selected. Please choose a location first.
        </Typography>
      </Box>
    );
  }

  // Reflect any timed-out approvals before rendering — see
  // OrderSessionService.expireStaleApprovals.
  await OrderSessionService.expireStaleApprovals(selectedLocation.locationId);
  const sessions = await OrderSessionService.getSessionsForLocation(
    selectedLocation.locationId,
  );

  return <OrderListView sessions={sessions} />;
}
