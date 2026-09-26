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
import { alpha } from "@mui/material/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ClearIcon from "@mui/icons-material/Clear";
import RefreshIcon from "@mui/icons-material/Refresh";
import SearchIcon from "@mui/icons-material/Search";
import { hoverCapableMedia, topBarHeight } from "@/app/lib/theme/sharedThemeTokens";
import DayNavigator from "./DayNavigator";

interface HistoryHeaderProps {
  locationName: string | null;
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

const TABS: { value: "paid" | "cancelled"; label: string }[] = [
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
];

/** Sticky (back+title+refresh, day navigator+search, Paid/Cancelled
 *  switch) — the summary cards and the list scroll away underneath it
 *  (DESIGN.md Rule 23: sticky filters, page scroll, no nested scroll
 *  box). Lives inside the left column of the lg+ two-column layout, so
 *  it only ever spans that column's own width, not the whole page. */
export default function HistoryHeader({
  locationName,
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
        bgcolor: "background.paper",
        borderBottom: 1,
        borderColor: "divider",
        pt: 1.5,
        pb: 1.5,
        px: { xs: 1.5, sm: 2, md: 3 },
      })}
    >
      {/* Row 1 — back, title + subline, refresh. */}
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
        <IconButton
          component={Link}
          href="/backoffice/order"
          aria-label="Back to orders"
          sx={{ width: 44, height: 44 }}
        >
          <ArrowBackIcon />
        </IconButton>
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          {/* Sans (FONT_BODY) on purpose — h6 on this page would render
             the theme's serif display font, meant for section headings
             elsewhere, not this page's own title. h5 is bold+sans and
             already used for money totals below/in the detail panel. */}
          <Typography component="h1" variant="h5" noWrap>
            Order history
          </Typography>
          <Typography variant="body2" color="text.secondary" noWrap>
            Closed bills{locationName ? ` · ${locationName}` : ""}
          </Typography>
        </Box>
        <IconButton
          aria-label="Refresh"
          onClick={onRefresh}
          disabled={isRefreshing}
          sx={{ width: 44, height: 44 }}
        >
          <RefreshIcon />
        </IconButton>
      </Stack>

      {/* Row 2 — day navigator and search side by side; search wraps to
         its own full-width line below sm. */}
      <Stack
        direction="row"
        useFlexGap
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
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

        <TextField
          size="small"
          label="Table or order #"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          sx={{ width: { xs: "100%", sm: 260 } }}
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
      </Stack>

      {/* Row 3 — Paid/Cancelled as one two-halved segmented control
         (not underline Tabs), each half with its own count pill. */}
      <Box
        role="tablist"
        aria-label="Order history tabs"
        sx={{
          display: "flex",
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
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
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                minHeight: 44,
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
              })}
            >
              <Typography variant="body1" sx={{ fontWeight: 700 }}>
                {item.label}
              </Typography>
              <Box
                component="span"
                sx={(theme) => ({
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 22,
                  height: 22,
                  px: 0.5,
                  borderRadius: "999px",
                  bgcolor: selected
                    ? alpha(theme.palette.primary.contrastText, 0.2)
                    : theme.palette.action.selected,
                })}
              >
                <Typography
                  variant="caption"
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
