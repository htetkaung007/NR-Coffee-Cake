"use client";

import { Box, Card, Divider, Stack, Typography } from "@mui/material";
import { formatAmount } from "@/app/lib/orderFormat";

function SummaryCell({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, px: 2, py: 1.5 }}>
      <Typography variant="overline" color="text.secondary" noWrap>
        {label}
      </Typography>
      {/* Money is never red (DESIGN.md Rule 13) — text.primary, bold
         sans (h5 — see HistoryHeader's own comment on why not h6). */}
      <Typography variant="h5" noWrap sx={{ color: "text.primary" }}>
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
