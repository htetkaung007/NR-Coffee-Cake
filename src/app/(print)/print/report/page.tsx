import { Box, Typography } from "@mui/material";
import { LocationService, ReportService } from "@/app/services";
import { buildItemList, reportHref } from "@/app/lib/report/reportView";
import { reportPeriodInputSchema } from "@/app/lib/schemas/reportSchema";
import { requireBackofficeAccess } from "@/app/lib/access/backofficeContext";
import { formatShopDateTime } from "@/app/lib/shopDay";
import ReportSheet from "./ReportSheet";

/** How many rows each list prints — the owner's short version. */
const BEST_SELLERS = 10;
const TOP_ADDONS = 5;

function Message({ children }: { children: React.ReactNode }) {
  return (
    <Box sx={{ p: 3 }}>
      <Typography color="text.secondary">{children}</Typography>
    </Box>
  );
}

/** The week's or month's report on A4, to print or "Save as PDF" — the
 *  same server-side access check as the Reports page (REPORTS_VIEW: the
 *  owner, or a manager granted it — a plain notice in place otherwise).
 *  Company and location come from the session, never the URL. The
 *  numbers come from ReportService.getPrintableReport — getOverview and
 *  getItems, the very methods behind the Reports page — so the paper
 *  always says what the screen says. Never prints by itself. */
export default async function PrintReportPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; day?: string }>;
}) {
  const raw = await searchParams;

  const { scope, fallback } = await requireBackofficeAccess({
    signedOut: "Please sign in to view reports.",
    access: "REPORTS_VIEW",
  });
  if (!scope) return fallback;
  const { companyId, userId } = scope;

  const selectedLocation = await LocationService.getSelectedLocation(userId);
  if (!selectedLocation) {
    return (
      <Message>No location selected. Please choose a location first.</Message>
    );
  }

  const parsed = reportPeriodInputSchema.safeParse({
    kind: raw.period,
    anchorDay: raw.day,
  });
  if (!parsed.success) {
    return <Message>This report link isn&apos;t valid.</Message>;
  }
  const { kind, anchorDay } = parsed.data;

  const [{ overview, items }, location] = await Promise.all([
    ReportService.getPrintableReport({
      companyId,
      locationId: selectedLocation.locationId,
      kind,
      anchorDay,
    }),
    LocationService.getLocationById(selectedLocation.locationId),
  ]);

  // Ranked exactly as the Reports page ranks its best sellers; add-ons
  // already come in the Add-ons card's order.
  const bestSellers = buildItemList({
    items: items.items,
    slowSellers: items.slowSellers,
    list: "top",
    sortBy: "sales",
    categoryId: null,
    search: "",
  }).slice(0, BEST_SELLERS);

  return (
    <ReportSheet
      locationName={location?.name ?? ""}
      generatedAt={formatShopDateTime(new Date())}
      overview={overview}
      bestSellers={bestSellers}
      topAddons={items.addons.slice(0, TOP_ADDONS)}
      reportsHref={reportHref({
        kind,
        day: anchorDay,
        tab: "overview",
        list: "top",
      })}
    />
  );
}
