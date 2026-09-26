import { redirect } from "next/navigation";
import { Box, Typography } from "@mui/material";
import {
  AppService,
  LocationService,
  OrderSessionApprovalService,
} from "@/app/services";
import { getSessionContext } from "@/app/lib/session";
import { buildEntryBillFromSessions } from "@/app/lib/orderTotals";
import PrintReceipt from "./PrintReceipt";

function Message({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography color="text.secondary">{children}</Typography>
    </Box>
  );
}

/** Printable bill for one Order List entry — accepted rounds only (a
 *  round still awaiting approval could be rejected, so it's never on
 *  the bill; see buildEntryBill). Opened by "Print bill" on the entry's
 *  detail page, prints itself once rendered. Same access and the same
 *  entry lookup as the detail page. */
export default async function PrintOrderPage({
  params,
}: {
  params: Promise<{ entryKey: string }>;
}) {
  const { entryKey } = await params;

  const { companyId, userId } = await getSessionContext();
  if (!companyId || !userId) redirect("/auth/signIn");

  const selectedLocation = await LocationService.getSelectedLocation(userId);
  if (!selectedLocation) {
    return (
      <Message>No location selected. Please choose a location first.</Message>
    );
  }

  const entry = await OrderSessionApprovalService.getOpenEntry(
    selectedLocation.locationId,
    entryKey,
  );
  if (!entry) return <Message>This bill is no longer open.</Message>;

  const [shopName, location] = await Promise.all([
    AppService.getCompanyNameByCompanyId(companyId),
    LocationService.getLocationById(selectedLocation.locationId),
  ]);

  return (
    <PrintReceipt
      entryKey={entry.key}
      shopName={shopName}
      locationName={location?.name ?? null}
      title={entry.title}
      bill={buildEntryBillFromSessions(entry.sessions)}
    />
  );
}
