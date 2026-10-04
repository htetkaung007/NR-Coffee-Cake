"use client";

import { Box, Stack } from "@mui/material";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import EmptyState from "@/app/components/EmptyState";
import { reportHref, type ReportParams } from "@/app/lib/reportView";
import type { ReportOverview } from "./action";
import CancelledCard from "./CancelledCard";
import ChannelsCard from "./ChannelsCard";
import DailySalesChart from "./DailySalesChart";
import KpiCards from "./KpiCards";
import SellersPreview from "./SellersPreview";
import type { ItemsState } from "./useReportItems";

interface OverviewTabProps {
  overview: ReportOverview;
  itemsState: ItemsState;
  onRetryItems: () => void;
  params: ReportParams;
  today: string;
  onNavigate: (href: string) => void;
}

/** KPI cards, the daily chart, the order channels and cancelled summary,
 *  and a peek at best / slow sellers. A period with no paid bills is one
 *  empty state (the header and tabs above it stay). */
export default function OverviewTab({
  overview,
  itemsState,
  onRetryItems,
  params,
  today,
  onNavigate,
}: OverviewTabProps) {
  if (overview.current.summary.bills === 0) {
    return (
      <EmptyState
        Icon={ReceiptLongIcon}
        message="No paid bills in this period"
      />
    );
  }

  const seeAll = (list: "top" | "slow") =>
    reportHref({ ...params, tab: "items", list });

  return (
    <Stack spacing={2}>
      <KpiCards overview={overview} />
      <DailySalesChart
        period={overview.period}
        daily={overview.current.daily}
        today={today}
      />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
          gap: 2,
          alignItems: "start",
        }}
      >
        <Stack spacing={2}>
          <ChannelsCard channels={overview.current.channels} />
          <CancelledCard cancelled={overview.current.cancelled} />
        </Stack>
        <Stack spacing={2}>
          <SellersPreview
            variant="best"
            state={itemsState}
            onRetry={onRetryItems}
            seeAllHref={seeAll("top")}
            onNavigate={onNavigate}
          />
          <SellersPreview
            variant="slow"
            state={itemsState}
            onRetry={onRetryItems}
            seeAllHref={seeAll("slow")}
            onNavigate={onNavigate}
          />
        </Stack>
      </Box>
    </Stack>
  );
}
