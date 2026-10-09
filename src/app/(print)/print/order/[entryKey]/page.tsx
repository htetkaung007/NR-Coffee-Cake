import { redirect } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { CompanyService, LocationService, OrderListService } from "@/app/services";
import { getSessionContext } from "@/app/lib/access/session";
import { buildEntryBillFromSessions } from "@/app/lib/order/orderTotals";
import ReceiptLayout from "../../ReceiptLayout";

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

  const selectedLocation = await LocationService.getSelectedLocation(
    userId,
    companyId,
  );
  if (!selectedLocation) {
    return (
      <Message>No location selected. Please choose a location first.</Message>
    );
  }

  const entry = await OrderListService.getOpenEntry(
    selectedLocation.locationId,
    entryKey,
  );
  if (!entry) return <Message>This bill is no longer open.</Message>;

  const [shopName, location] = await Promise.all([
    CompanyService.getName(companyId),
    LocationService.getLocationById(selectedLocation.locationId),
  ]);

  const bill = buildEntryBillFromSessions(entry.sessions);

  return (
    <ReceiptLayout
      backHref={`/backoffice/order/${entry.key}`}
      backLabel="Back to order"
      shopName={shopName}
      locationName={location?.name ?? null}
      title={entry.title}
      rounds={bill.acceptedRounds}
      total={bill.total}
      pendingCount={bill.pendingRounds.length}
      status={{ paid: false }}
    />
  );
}
