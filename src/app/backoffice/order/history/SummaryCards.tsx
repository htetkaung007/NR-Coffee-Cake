"use client";

import { Box, Card, Divider, Stack, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";
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
  const t = useTranslations("bo.history");
  const money = useStaffMoney();
  return (
    <Card variant="outlined" sx={{ mb: 2 }}>
      <Stack direction="row" divider={<Divider orientation="vertical" flexItem />}>
        {tab === "paid" ? (
          <>
            <SummaryCell label={t("bills")} value={paid.bills} />
            <SummaryCell label={t("revenue")} value={money.amount(paid.revenue)} />
            <SummaryCell label={t("avgBill")} value={money.amount(paid.avgBill)} />
          </>
        ) : (
          <>
            <SummaryCell label={t("cancelled")} value={cancelled.count} />
            <SummaryCell
              label={t("notCharged")}
              value={money.amount(cancelled.notCharged)}
            />
          </>
        )}
      </Stack>
    </Card>
  );
}
