"use client";

import { Card, Divider, Stack, Typography } from "@mui/material";
import { formatAmount } from "@/app/lib/orderFormat";
import { formatVoidReasonCounts } from "@/app/lib/report/voidReport";
import type { ReportOverview } from "./action";
import { sectionHeadingSx } from "../order/orderTypography";
import { FigureCell } from "./CancelledCard";

/** Items voided · Not charged — items staff took back off the period's
 *  paid bills (lib/order/voids), never part of Sales. Under the count,
 *  why: "Wrong item 2 · Other 1" (non-zero reasons only, in words). The
 *  money is neutral: nothing was received (DESIGN.md Rule 13). */
export default function VoidedCard({
  voided,
}: {
  voided: ReportOverview["current"]["voided"];
}) {
  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Typography
        variant="body1"
        component="h2"
        sx={{ ...sectionHeadingSx, mb: 1 }}
      >
        Voided items
      </Typography>
      <Stack
        direction="row"
        divider={<Divider orientation="vertical" flexItem />}
        sx={{ mx: { xs: -1, sm: -2 } }}
      >
        <FigureCell
          label="Items voided"
          value={String(voided.count)}
          detail={formatVoidReasonCounts(voided.reasons) || undefined}
        />
        <FigureCell label="Not charged" value={formatAmount(voided.value)} />
      </Stack>
    </Card>
  );
}
