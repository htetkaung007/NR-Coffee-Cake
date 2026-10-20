"use client";

import { useRef } from "react";
import { Box } from "@mui/material";
import { useTranslations } from "next-intl";
import SegmentedTabs from "@/app/components/SegmentedTabs";
import { useStickyScrollPadding } from "@/app/components/StickyPageHeader";
import { topBarHeight } from "@/app/lib/theme/sharedThemeTokens";
import type { ReportPeriod } from "@/app/lib/report/reportPeriod";
import {
  printableReportHref,
  reportExportHref,
  reportHref,
  type ReportParams,
} from "@/app/lib/report/reportView";
import OrdersPageHeader from "../order/OrdersPageHeader";
import PeriodNavigator from "./PeriodNavigator";
import ReportExportMenu from "./ReportExportMenu";

interface ReportsHeaderProps {
  params: ReportParams;
  period: ReportPeriod;
  today: string;
  shopTimezone: string;
  onNavigate: (href: string) => void;
}

// On phones each control grows to fill whatever row it wraps onto (easier
// to tap); from sm they're only as wide as their content.
const controlSx = {
  width: "auto",
  flex: { xs: "1 1 auto", sm: "0 0 auto" },
} as const;

/** The title (the Orders pages' own header component, retitled) with
 *  Export at the right end of its row at every width, which scrolls
 *  away; then the controls — Week | Month, Overview | Items and the
 *  period navigator. From sm they're ONE sticky row. Below sm only the
 *  period navigator's row is sticky; the two switches sit above it and
 *  scroll away with the title, so the pinned area stays short on a
 *  phone. ONE set of controls either way (below sm the wrappers are
 *  display "contents", so the navigator's sticky box spans the page).
 *  All of them links, so the view state lives in the URL and Back works
 *  (DESIGN.md Rule 17). The chart and cards scroll away underneath
 *  (Rule 23). */
export default function ReportsHeader({
  params,
  period,
  today,
  shopTimezone,
  onNavigate,
}: ReportsHeaderProps) {
  const t = useTranslations("bo.reports");
  const withParams = (changes: Partial<ReportParams>) =>
    reportHref({ ...params, ...changes });
  // Whichever is sticky at this width sets the page's scroll padding.
  const rowRef = useRef<HTMLElement | null>(null);
  const navigatorRef = useRef<HTMLDivElement | null>(null);
  useStickyScrollPadding([rowRef, navigatorRef]);

  return (
    <>
      <Box sx={{ px: { xs: 0, sm: 2, md: 3 }, pb: 1 }}>
        <OrdersPageHeader
          title={t("title")}
          showSectionNav={false}
          inlineActions
          // The printable report for the period on screen right now.
          actions={
            <ReportExportMenu
              printHref={printableReportHref({
                kind: params.kind,
                day: params.day,
              })}
              linesCsvHref={reportExportHref({
                type: "lines",
                kind: params.kind,
                day: params.day,
              })}
              cancelledCsvHref={reportExportHref({
                type: "cancelled",
                kind: params.kind,
                day: params.day,
              })}
            />
          }
        />
      </Box>

      {/* sm+: THE sticky row (StickyPageHeader's "below-title" look).
          Below sm: no box of its own. */}
      <Box
        ref={rowRef}
        component="header"
        sx={(theme) => ({
          display: { xs: "contents", sm: "flex" },
          position: { sm: "sticky" },
          top: topBarHeight(theme),
          zIndex: 2,
          bgcolor: "background.default",
          borderBottom: { sm: 1 },
          borderColor: "divider",
          py: { sm: 1 },
          px: { sm: 2, md: 3 },
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
        })}
      >
        {/* The two switches: their own wrapping row below sm (in flow),
            plain items of the sticky row from sm. */}
        <Box
          sx={{
            display: { xs: "flex", sm: "contents" },
            flexWrap: "wrap",
            gap: 1,
            pt: 1,
          }}
        >
          <SegmentedTabs
            ariaLabel={t("periodTabs")}
            value={params.kind}
            onNavigate={onNavigate}
            sx={controlSx}
            items={[
              { value: "week", label: t("week"), href: withParams({ kind: "week" }) },
              {
                value: "month",
                label: t("month"),
                href: withParams({ kind: "month" }),
              },
            ]}
          />
          <SegmentedTabs
            ariaLabel={t("sectionTabs")}
            value={params.tab}
            onNavigate={onNavigate}
            sx={controlSx}
            items={[
              {
                value: "overview",
                label: t("overview"),
                href: withParams({ tab: "overview" }),
              },
              { value: "items", label: t("items"), href: withParams({ tab: "items" }) },
            ]}
          />
        </Box>
        {/* Below sm: the ONE pinned row (page surface + bottom divider,
            like the sticky header). From sm: the row's right end. */}
        <Box
          ref={navigatorRef}
          sx={(theme) => ({
            position: { xs: "sticky", sm: "static" },
            top: topBarHeight(theme),
            zIndex: 2,
            bgcolor: { xs: "background.default", sm: "transparent" },
            borderBottom: { xs: 1, sm: 0 },
            borderColor: "divider",
            py: { xs: 1, sm: 0 },
            ml: { sm: "auto" },
            flex: { xs: "1 1 auto", sm: "0 0 auto" },
            display: "flex",
            justifyContent: "center",
          })}
        >
          <PeriodNavigator
            params={params}
            period={period}
            today={today}
            shopTimezone={shopTimezone}
            onNavigate={onNavigate}
          />
        </Box>
      </Box>
    </>
  );
}
