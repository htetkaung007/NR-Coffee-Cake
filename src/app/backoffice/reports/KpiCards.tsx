"use client";

import { Box, Card, Typography } from "@mui/material";
import { formatAmount } from "@/app/lib/orderFormat";
import type { ReportOverview } from "./action";
import ReportDelta from "./ReportDelta";
import { moneyToneSx, type MoneyTone } from "../order/orderTypography";

/** Sales · Bills · Avg. bill · Cancelled, each with its change on the
 *  previous period. The Order History summary's own label and value
 *  styles (caption in capitals, body1 bold in text.primary — money is
 *  never red, DESIGN.md Rule 13), as four cards: two across on phones,
 *  four from md. */
export default function KpiCards({ overview }: { overview: ReportOverview }) {
  const { summary, cancelled } = overview.current;
  const { deltas, period } = overview;

  // Money received is in the income tone; counts stay neutral.
  const cards: {
    label: string;
    value: string;
    delta: number | null;
    tone: MoneyTone;
  }[] = [
    {
      label: "Sales",
      value: formatAmount(summary.sales),
      delta: deltas.sales,
      tone: "income",
    },
    {
      label: "Bills",
      value: String(summary.bills),
      delta: deltas.bills,
      tone: "neutral",
    },
    {
      label: "Avg. bill",
      value: formatAmount(summary.avgBill),
      delta: deltas.avgBill,
      tone: "income",
    },
    {
      label: "Cancelled",
      value: String(cancelled.count),
      delta: deltas.cancelled,
      tone: "neutral",
    },
  ];

  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
        gap: 1.5,
      }}
    >
      {cards.map((card) => (
        <Card key={card.label} variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
          <Typography
            variant="caption"
            component="p"
            color="text.secondary"
            noWrap
            sx={{ textTransform: "uppercase" }}
          >
            {card.label}
          </Typography>
          {/* Never cut off — a value too wide for its card wraps. */}
          <Typography
            variant="body1"
            component="p"
            sx={moneyToneSx(card.tone)}
          >
            {card.value}
          </Typography>
          <ReportDelta percent={card.delta} kind={period.kind} />
        </Card>
      ))}
    </Box>
  );
}
