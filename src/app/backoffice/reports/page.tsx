import { AppError } from "@/app/lib/errors";
import { requireBackofficeContext } from "@/app/lib/backofficeContext";
import { parseReportParams } from "@/app/lib/reportView";
import { todayInShop } from "@/app/lib/shopDay";
import { ReportService } from "@/app/services";
import { config } from "@/app/utils/config";
import ReportsView from "./ReportsView";

/** Reports — Admins only, for the location they have selected. The URL
 *  (?period=week|month&day=YYYY-MM-DD&tab=overview|items) is the view
 *  state; whatever it holds is made safe (parseReportParams) and this
 *  loads the Overview for it. The Items data is NOT loaded here — the
 *  client fetches it in the background, so the Overview never waits. */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    period?: string;
    day?: string;
    tab?: string;
    list?: string;
  }>;
}) {
  const raw = await searchParams;

  const { context, fallback } = await requireBackofficeContext({
    signedOut: "Please sign in to view reports.",
    forbidden: "Reports are available to admins",
  });
  if (!context) return fallback;

  const today = todayInShop();
  const params = parseReportParams(raw, today);

  // A failure is shown in the page with a Retry (the header and tabs
  // stay), not as an error screen. Only an AppError's message is safe to
  // show; anything else is logged and shown generically (Rule 6).
  let overview = null;
  let overviewError: string | null = null;
  try {
    overview = await ReportService.getOverview({
      companyId: context.companyId,
      locationId: context.location.locationId,
      kind: params.kind,
      anchorDay: params.day,
    });
  } catch (error) {
    if (error instanceof AppError) {
      overviewError = error.message;
    } else {
      console.error("[ReportsPage] Unhandled error:", error);
      overviewError = "Couldn't load the report. Please try again.";
    }
  }

  return (
    <ReportsView
      params={params}
      today={today}
      shopTimezone={config.shopTimezone}
      overview={overview}
      overviewError={overviewError}
    />
  );
}
