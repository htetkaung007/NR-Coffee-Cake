"use client";

import { Box, Card, Divider, Stack, Typography } from "@mui/material";
import { formatAmount } from "@/app/lib/orderFormat";
import { formatRejectReasonCounts } from "@/app/lib/order/rejectReason";
import type { ReportOverview } from "./action";
import { moneyToneSx, sectionHeadingSx } from "../order/orderTypography";

/** One figure of a Reports card: caption, neutral value, optional detail
 *  line — shared with VoidedCard. */
export function FigureCell({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  /** A small line under the value (Rejected: the reasons). */
  detail?: string;
}) {
  return (
    <Box sx={{ flex: 1, minWidth: 0, px: { xs: 1, sm: 2 }, py: 0.5 }}>
      <Typography
        variant="caption"
        component="p"
        color="text.secondary"
        sx={{ textTransform: "uppercase" }}
      >
        {label}
      </Typography>
      <Typography
        variant="body1"
        component="p"
        // Neutral: nothing was received (DESIGN.md Rule 13).
        sx={moneyToneSx("neutral")}
      >
        {value}
      </Typography>
      {detail && (
        <Typography variant="caption" component="p" color="text.secondary">
          {detail}
        </Typography>
      )}
    </Box>
  );
}

/** Rejected · Timed out · Not charged — the shop's misses (REJECTED /
 *  EXPIRED rounds, priced from their snapshots), over the whole period.
 *  Orders customers cancelled themselves while they waited are counted
 *  apart, in a line under them — never part of these figures. Under Rejected, why: "Out of stock
 *  1 · Looks fake 2" (non-zero reasons only, in words — never colour).
 *  On a phone that line wraps inside its third of the card. */
export default function CancelledCard({
  cancelled,
}: {
  cancelled: ReportOverview["current"]["cancelled"];
}) {
  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Typography
        variant="body1"
        component="h2"
        sx={{ ...sectionHeadingSx, mb: 1 }}
      >
        Cancelled orders
      </Typography>
      <Stack
        direction="row"
        divider={<Divider orientation="vertical" flexItem />}
        sx={{ mx: { xs: -1, sm: -2 } }}
      >
        <FigureCell
          label="Rejected"
          value={String(cancelled.rejected)}
          detail={formatRejectReasonCounts(cancelled.reasons) || undefined}
        />
        <FigureCell label="Timed out" value={String(cancelled.timedOut)} />
        <FigureCell label="Not charged" value={formatAmount(cancelled.notCharged)} />
      </Stack>
      {cancelled.withdrawn > 0 && (
        // Not the shop's miss — counted apart, never in the figures above.
        <Typography variant="caption" component="p" color="text.secondary" sx={{ mt: 1 }}>
          Also cancelled by customers before approval: {cancelled.withdrawn}
        </Typography>
      )}
    </Card>
  );
}
