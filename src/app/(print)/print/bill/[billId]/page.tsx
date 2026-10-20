import {
  CompanyService,
  LocationService,
  OrderHistoryService,
} from "@/app/services";
import { NotFoundError } from "@/app/lib/errors";
import { toShopDay } from "@/app/lib/shopDay";
import { getTranslations } from "next-intl/server";
import ReceiptLayout from "../../ReceiptLayout";
import { VOUCHER_MESSAGES } from "../../voucherMessages";
import { PrintMessage, getPrintContext } from "../../../printContext";

/** A paid bill's receipt, reprinted from Order History — the same
 *  access checks and the same ReceiptLayout as the open bill's receipt
 *  (/print/order/[entryKey]), so the two look identical. Differences:
 *  "PAID · <when>" instead of "BILL — NOT PAID", and the total is the
 *  bill's stored Bill.total snapshot, never recomputed. A bill that
 *  doesn't exist or belongs to another location gets the same plain
 *  "not found" message. */
export default async function PrintPaidBillPage({
  params,
}: {
  params: Promise<{ billId: string }>;
}) {
  const { billId: billIdParam } = await params;

  const context = await getPrintContext();
  if (context.fallback) return context.fallback;
  const { companyId, locationId } = context;

  const t = await getTranslations("bo.print");
  const notFound = <PrintMessage>{t("notFound")}</PrintMessage>;
  if (!/^\d+$/.test(billIdParam)) return notFound;

  let bill: Awaited<ReturnType<typeof OrderHistoryService.getPaidBillDetail>>;
  try {
    bill = await OrderHistoryService.getPaidBillDetail({
      locationId,
      billId: Number(billIdParam),
    });
  } catch (error) {
    if (error instanceof NotFoundError) return notFound;
    throw error;
  }

  const [shopName, location] = await Promise.all([
    CompanyService.getName(companyId),
    LocationService.getLocationById(locationId),
  ]);

  // Back to this bill, open, on its own day in History.
  const historyParams = new URLSearchParams({
    day: toShopDay(bill.paidAt),
    tab: "paid",
    bill: String(bill.id),
  });

  return (
    <ReceiptLayout
      backHref={`/backoffice/order/history?${historyParams.toString()}`}
      backLabel="backToHistory"
      voucherMessages={VOUCHER_MESSAGES}
      shopName={shopName}
      locationName={location?.name ?? null}
      title={bill.title}
      // Dates cross the Server→Client boundary as ISO strings.
      rounds={bill.rounds.map((round) => ({
        ...round,
        time: round.time.toISOString(),
      }))}
      total={bill.total}
      status={{ paid: true, paidAt: bill.paidAt.toISOString() }}
    />
  );
}
