"use client";

import {
  Box,
  IconButton,
  Stack,
} from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import RefreshIcon from "@mui/icons-material/Refresh";
import { useTranslations } from "next-intl";
import SearchField from "@/app/components/SearchField";
import SegmentedTabs from "@/app/components/SegmentedTabs";
import StickyPageHeader from "@/app/components/StickyPageHeader";
import DayNavigator from "./DayNavigator";
import OrdersPageHeader from "../OrdersPageHeader";

interface HistoryHeaderProps {
  day: string;
  minDay: string;
  maxDay: string;
  today: string;
  shopTimezone: string;
  tab: "paid" | "cancelled";
  paidCount: number;
  cancelledCount: number;
  search: string;
  onSearchChange: (value: string) => void;
  onNavigateDay: (day: string) => void;
  buildDayHref: (day: string) => string;
  buildTabHref: (tab: "paid" | "cancelled") => string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

/** Reloads the summary and the list (HistoryView's handleRefresh). */
function RefreshButton({
  onRefresh,
  isRefreshing,
  sx,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
  sx?: SxProps<Theme>;
}) {
  const t = useTranslations("bo.history");
  return (
    <IconButton
      aria-label={t("refresh")}
      onClick={onRefresh}
      disabled={isRefreshing}
      sx={[{ width: 44, height: 44 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <RefreshIcon />
    </IconButton>
  );
}

const TABS = ["paid", "cancelled"] as const;

/** Sticky (the shared Orders header with Refresh, day navigator+search,
 *  Paid/Cancelled switch) — the summary cards and the list scroll away
 *  underneath it (DESIGN.md Rule 23: sticky filters, page scroll, no
 *  nested scroll box). Lives inside the left column of the lg+
 *  two-column layout, so it only ever spans that column's own width,
 *  not the whole page. */
export default function HistoryHeader({
  day,
  minDay,
  maxDay,
  today,
  shopTimezone,
  tab,
  paidCount,
  cancelledCount,
  search,
  onSearchChange,
  onNavigateDay,
  buildDayHref,
  buildTabHref,
  onRefresh,
  isRefreshing,
}: HistoryHeaderProps) {
  const t = useTranslations("bo.history");
  const counts: Record<"paid" | "cancelled", number> = {
    paid: paidCount,
    cancelled: cancelledCount,
  };

  return (
    <StickyPageHeader>
      {/* Row 1 — the Orders header shared with the Order List. */}
      <Box sx={{ mb: 2 }}>
        <OrdersPageHeader />
      </Box>

      {/* Row 2 — the data controls: day navigator … search, refresh.
         Phones: search takes its own full-width line below, and Refresh
         stays on the day navigator's line, right-aligned. Refresh is
         rendered once per layout (the other one display:none, so it
         leaves the tab order — DESIGN.md Rule 10) instead of reordered
         with CSS `order`, so keyboard order always matches what's on
         screen. */}
      <Stack
        direction="row"
        useFlexGap
        sx={{
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 1.5,
        }}
      >
        <DayNavigator
          day={day}
          minDay={minDay}
          maxDay={maxDay}
          today={today}
          shopTimezone={shopTimezone}
          onNavigate={onNavigateDay}
          buildHref={buildDayHref}
        />

        <RefreshButton
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          sx={{ ml: "auto", display: { xs: "inline-flex", sm: "none" } }}
        />

        <SearchField
          label={t("search")}
          value={search}
          onChange={onSearchChange}
          sx={{ width: { xs: "100%", sm: 260 }, ml: { sm: "auto" } }}
        />

        <RefreshButton
          onRefresh={onRefresh}
          isRefreshing={isRefreshing}
          sx={{ display: { xs: "none", sm: "inline-flex" } }}
        />
      </Stack>

      {/* Row 3 — Paid/Cancelled as one two-halved segmented control
         (not underline Tabs), each half with its own count pill. Full
         width on phones (easier to tap); from sm only as wide as its
         content and pushed to the right edge, lining up with the search
         field above. */}
      <SegmentedTabs
        ariaLabel={t("tabs")}
        value={tab}
        items={TABS.map((value) => ({
          value,
          label: t(value),
          href: buildTabHref(value),
          count: counts[value],
        }))}
        sx={{ ml: { sm: "auto" } }}
      />
    </StickyPageHeader>
  );
}
