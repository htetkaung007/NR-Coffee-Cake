import { CompanyService, LocationService, OrderListService } from "@/app/services";
import { buildEntryBillFromSessions } from "@/app/lib/order/orderTotals";
import { getTranslations } from "next-intl/server";
import ReceiptLayout from "../../ReceiptLayout";
import { VOUCHER_MESSAGES } from "../../voucherMessages";
import { PrintMessage, getPrintContext } from "../../../printContext";

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

  const context = await getPrintContext();
  if (context.fallback) return context.fallback;
  const { companyId, locationId } = context;

  const entry = await OrderListService.getOpenEntry(locationId, entryKey);
  if (!entry) {
    const t = await getTranslations("bo.print");
    return <PrintMessage>{t("noLongerOpen")}</PrintMessage>;
  }

  const [shopName, location] = await Promise.all([
    CompanyService.getName(companyId),
    LocationService.getLocationById(locationId),
  ]);

  const bill = buildEntryBillFromSessions(entry.sessions);

  return (
    <ReceiptLayout
      backHref={`/backoffice/order/${entry.key}`}
      backLabel="backToOrder"
      voucherMessages={VOUCHER_MESSAGES}
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
