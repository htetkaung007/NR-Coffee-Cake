"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Typography } from "@mui/material";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { periodFor } from "@/app/lib/reportPeriod";
import { REPORT_FOOTNOTE, type ReportParams } from "@/app/lib/reportView";
import type { ReportOverview } from "./action";
import ItemsTab from "./ItemsTab";
import OverviewTab from "./OverviewTab";
import ReportsHeader from "./ReportsHeader";
import { ErrorRetry } from "./ReportStates";
import { useReportItems } from "./useReportItems";


interface ReportsViewProps {
  params: ReportParams;
  today: string;
  shopTimezone: string;
  /** The server's answer for the URL's period; null when it failed. */
  overview: ReportOverview | null;
  overviewError: string | null;
}

/**
 * The Reports page's client side. The period, tab and list live in the
 * URL: every control navigates (router.push inside a transition), the
 * server answers with the new period's Overview, and this component stays
 * mounted — so the chart has already drawn and a switch is only a short
 * crossfade, never a redraw. While the answer is on its way the old
 * content stays (dimmed) rather than blanking. The Items data is loaded
 * separately, in the background, by useReportItems.
 */
export default function ReportsView({
  params,
  today,
  shopTimezone,
  overview,
  overviewError,
}: ReportsViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const period = overview?.period ?? periodFor(params.kind, params.day);
  const items = useReportItems(
    params.kind,
    overview ? overview.period.startDay : null,
  );

  function go(href: string) {
    startTransition(() => router.push(href, { scroll: false }));
  }

  function retryOverview() {
    startTransition(() => router.refresh());
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box>
        <ReportsHeader
          params={params}
          period={period}
          today={today}
          shopTimezone={shopTimezone}
          onNavigate={go}
        />

        <Box
          aria-busy={isPending}
          sx={{
            px: { xs: 0, sm: 2, md: 3 },
            pt: 2,
            pb: 3,
            opacity: isPending ? 0.5 : 1,
            transition: "opacity 150ms ease-out",
          }}
        >
          {overview === null ? (
            <ErrorRetry
              message={overviewError ?? "Couldn't load the report."}
              onRetry={retryOverview}
            />
          ) : params.tab === "overview" ? (
            <OverviewTab
              overview={overview}
              itemsState={items.state}
              onRetryItems={items.retry}
              params={params}
              today={today}
              onNavigate={go}
            />
          ) : (
            <ItemsTab
              overview={overview}
              today={today}
              state={items.state}
              onRetry={items.retry}
              params={params}
              onNavigate={go}
            />
          )}

          <Typography
            variant="caption"
            component="p"
            color="text.secondary"
            sx={{ mt: 3 }}
          >
            {REPORT_FOOTNOTE}.
          </Typography>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}
