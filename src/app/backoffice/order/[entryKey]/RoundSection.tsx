"use client";

import { Box, Typography } from "@mui/material";
import BillLineRows from "@/app/components/BillLineRows";
import type { EntryBill } from "@/app/lib/order/orderTotals";
import { useTranslations } from "next-intl";
import { useClockTime } from "@/app/lib/hooks/useStaffWords";

type BillRound = EntryBill["acceptedRounds"][number];

/** One round's line items — "Order #1043 · 11:20 AM" then each line
 *  itemised through BillLineRows ("Name ×qty" and its amount, then one
 *  row per add-on). The live Order List's bill (BillContent) and the
 *  History page's bill/round detail both render a round through this. */
export default function RoundSection({ round }: { round: BillRound }) {
  const t = useTranslations("bo.detail");
  const clockTime = useClockTime();
  return (
    <Box component="section" sx={{ pt: 2 }}>
      <Typography
        component="h3"
        variant="overline"
        color="text.secondary"
        sx={{ display: "block" }}
      >
        {t("roundSection", { number: round.orderNumber, time: clockTime(round.time) })}
      </Typography>
      <Box component="ul" sx={{ listStyle: "none", m: 0, p: 0 }}>
        {round.lines.map((line) => (
          <Box component="li" key={line.id} sx={{ py: 0.5 }}>
            <BillLineRows rows={line.breakdown} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
