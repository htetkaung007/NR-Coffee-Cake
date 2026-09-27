"use client";

import Link from "next/link";
import {
  Box,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { alpha, type SxProps, type Theme } from "@mui/material/styles";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { hoverCapableMedia, topBarHeight } from "@/app/lib/theme/sharedThemeTokens";
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
  return (
    <IconButton
      aria-label="Refresh"
      onClick={onRefresh}
      disabled={isRefreshing}
      sx={[{ width: 44, height: 44 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <RefreshIcon />
    </IconButton>
  );
}

const TABS: { value: "paid" | "cancelled"; label: string }[] = [
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

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
  const counts: Record<"paid" | "cancelled", number> = {
    paid: paidCount,
    cancelled: cancelledCount,
  };

  return (
    <Box
      component="header"
      sx={(theme) => ({
        position: "sticky",
        top: topBarHeight(theme),
        zIndex: 2,
        // Page surface (cream), so the white cards below read as cards.
        bgcolor: "background.default",
        borderBottom: 1,
        borderColor: "divider",
        // Same top offset as the Order List's page padding, so the shared
        // header sits in the same place on both routes.
        pt: { xs: 1.5, sm: 2, md: 3 },
        pb: 1.5,
        // xs: none of its own — BackofficeShell's gutter already applies.
        px: { xs: 0, sm: 2, md: 3 },
      })}
    >
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

        <TextField
          size="small"
          label="Table or order #"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          sx={{ width: { xs: "100%", sm: 260 }, ml: { sm: "auto" } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
              endAdornment: search && (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Clear search"
                    size="small"
                    onClick={() => onSearchChange("")}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
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
         field above. A two-column 1fr grid keeps both halves the same
         width — the wider label's — at either size. */}
      <Box
        role="tablist"
        aria-label="Order history tabs"
        sx={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          width: { xs: "100%", sm: "fit-content" },
          ml: { sm: "auto" },
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
          p: 0.5,
          gap: 0.5,
        }}
      >
        {TABS.map((item) => {
          const selected = item.value === tab;
          return (
            <Box
              key={item.value}
              component={Link}
              href={buildTabHref(item.value)}
              role="tab"
              aria-selected={selected}
              sx={(theme) => ({
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                minHeight: 44,
                px: 1.5,
                borderRadius: 1.5,
                textDecoration: "none",
                color: selected ? "primary.contrastText" : "text.primary",
                bgcolor: selected ? "primary.main" : "transparent",
                transition:
                  "background-color 160ms ease-out, color 160ms ease-out",
                [hoverCapableMedia]: {
                  "&:hover": {
                    bgcolor: selected
                      ? "primary.main"
                      : theme.palette.action.hover,
                  },
                },
                "&:focus-visible": {
                  outline: `2px solid ${theme.palette.primary.main}`,
                  outlineOffset: 2,
                },
              })}
            >
              {/* Same variant as the Order List's [Open] [History]. */}
              <Typography component="span" variant="button">
                {item.label}
              </Typography>
              <Box
                component="span"
                sx={(theme) => ({
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 22,
                  minHeight: 22,
                  px: 0.5,
                  borderRadius: "999px",
                  bgcolor: alpha(
                    selected
                      ? theme.palette.primary.contrastText
                      : theme.palette.primary.main,
                    selected ? 0.2 : 0.08,
                  ),
                })}
              >
                <Typography
                  variant="button"
                  component="span"
                  sx={{
                    color: selected ? "primary.contrastText" : "text.secondary",
                  }}
                >
                  {counts[item.value]}
                </Typography>
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
