"use client";

import { Box, Stack, Typography } from "@mui/material";
import type { EntryBill } from "@/app/lib/orderTotals";
import { formatAmount, formatClockTime } from "@/app/lib/orderFormat";

type BillRound = EntryBill["acceptedRounds"][number];

/** One round's line items — "Order #1043 · 11:20 AM" then each line as
 *  "Name ×qty" with its add-on summary underneath and the line total
 *  on the right. The one place this markup lives: the live Order
 *  List's bill (BillContent) and the History page's bill/round detail
 *  both render a round through this. */
export default function RoundSection({ round }: { round: BillRound }) {
  return (
    <Box component="section" sx={{ pt: 2 }}>
      <Typography
        component="h3"
        variant="overline"
        color="text.secondary"
        suppressHydrationWarning
        sx={{ display: "block" }}
      >
        Order {round.orderNumber} · {formatClockTime(round.time)}
      </Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {round.lines.map((line) => (
          <Stack
            component="li"
            key={line.id}
            direction="row"
            spacing={2}
            sx={{ justifyContent: "space-between", py: 0.5 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="body1">
                {line.name} ×{line.qty}
              </Typography>
              {line.addonSummary && (
                <Typography variant="body2" color="text.secondary">
                  {line.addonSummary}
                </Typography>
              )}
            </Box>
            <Typography variant="body1" sx={{ flexShrink: 0 }}>
              {formatAmount(line.lineTotal)}
            </Typography>
          </Stack>
        ))}
      </Box>
    </Box>
  );
}
