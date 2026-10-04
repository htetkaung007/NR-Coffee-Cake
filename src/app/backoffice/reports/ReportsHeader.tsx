"use client";

import { Box, Stack } from "@mui/material";
import SegmentedTabs from "@/app/components/SegmentedTabs";
import StickyPageHeader from "@/app/components/StickyPageHeader";
import type { ReportPeriod } from "@/app/lib/reportPeriod";
import { reportHref, type ReportParams } from "@/app/lib/reportView";
import OrdersPageHeader from "../order/OrdersPageHeader";
import PeriodNavigator from "./PeriodNavigator";

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

/** The title (the Orders pages' own header component, retitled), which
 *  scrolls away, then ONE sticky row of controls — Week | Month,
 *  Overview | Items and the period navigator, wrapping on phones — so
 *  the pinned area stays short. All of them links, so the view state
 *  lives in the URL and Back works (DESIGN.md Rule 17). The chart and
 *  cards scroll away underneath (Rule 23). */
export default function ReportsHeader({
  params,
  period,
  today,
  shopTimezone,
  onNavigate,
}: ReportsHeaderProps) {
  const withParams = (changes: Partial<ReportParams>) =>
    reportHref({ ...params, ...changes });

  return (
    <>
      <Box sx={{ px: { xs: 0, sm: 2, md: 3 }, pb: 1 }}>
        <OrdersPageHeader title="Reports" showSectionNav={false} />
      </Box>

      <StickyPageHeader placement="below-title">
        <Stack
          direction="row"
          useFlexGap
          sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
        >
          <SegmentedTabs
            ariaLabel="Report period"
            value={params.kind}
            onNavigate={onNavigate}
            sx={controlSx}
            items={[
              { value: "week", label: "Week", href: withParams({ kind: "week" }) },
              {
                value: "month",
                label: "Month",
                href: withParams({ kind: "month" }),
              },
            ]}
          />
          <SegmentedTabs
            ariaLabel="Report sections"
            value={params.tab}
            onNavigate={onNavigate}
            sx={controlSx}
            items={[
              {
                value: "overview",
                label: "Overview",
                href: withParams({ tab: "overview" }),
              },
              { value: "items", label: "Items", href: withParams({ tab: "items" }) },
            ]}
          />
          <Box
            sx={{
              ml: { sm: "auto" },
              flex: { xs: "1 1 auto", sm: "0 0 auto" },
              display: "flex",
              justifyContent: "center",
            }}
          >
            <PeriodNavigator
              params={params}
              period={period}
              today={today}
              shopTimezone={shopTimezone}
              onNavigate={onNavigate}
            />
          </Box>
        </Stack>
      </StickyPageHeader>
    </>
  );
}
