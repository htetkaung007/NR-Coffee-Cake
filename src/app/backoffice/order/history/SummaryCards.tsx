"use client";

import { Box, Card, Divider, Stack, Typography } from "@mui/material";
import { formatAmount } from "@/app/lib/orderFormat";
import { moneySx } from "../orderTypography";

function SummaryCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, px: { xs: 1.5, sm: 2 }, py: 1.5 }}>
      <Typography
        variant="caption"
        component="p"
        color="text.secondary"
        noWrap
        sx={{ textTransform: "uppercase" }}
      >
        {label}
      </Typography>
      {/* The Order List's money style. Never red (DESIGN.md Rule 13) and
         never cut off — no noWrap: a value too wide for its cell wraps
         to a second line. */}
      <Typography
        variant="body1"
        component="p"
        sx={{ ...moneySx, color: "text.primary" }}
      >
        {value}
      </Typography>
    </Box>
  );
}

/** One card, three (or two) equal cells split by vertical dividers —
 *  Bills · Revenue · Avg. bill (Paid tab) or Cancelled · Not charged
 *  (Cancelled tab). Whole-day totals, unaffected by the current search
 *  (see getPaidSummary/getCancelledSummary's own comments). */
export default function SummaryCards({
  tab,
  paid,
  cancelled,
}: {
  tab: "paid" | "cancelled";
  paid: { bills: number; revenue: number; avgBill: number };
  cancelled: { count: number; notCharged: number };
}) {
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <Stack direction="row" divider={<Divider orientation="vertical" flexItem />}>
        {tab === "paid" ? (
          <>
            <SummaryCell label="Bills" value={paid.bills} />
            <SummaryCell label="Revenue" value={formatAmount(paid.revenue)} />
            <SummaryCell label="Avg. bill" value={formatAmount(paid.avgBill)} />
          </>
        ) : (
          <>
            <SummaryCell label="Cancelled" value={cancelled.count} />
            <SummaryCell
              label="Not charged"
              value={formatAmount(cancelled.notCharged)}
            />
          </>
        )}
      </Stack>
    </Card>
  );
}
