"use client";

import { Box, Card, Divider, Stack, Typography } from "@mui/material";
import { formatAmount } from "@/app/lib/orderFormat";
import type { ReportOverview } from "./action";
import { moneyToneSx, sectionHeadingSx } from "../order/orderTypography";

function Cell({ label, value }: { label: string; value: string }) {
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
    </Box>
  );
}

/** Rejected · Timed out · Not charged — the Order History Cancelled
 *  tab's own definition (REJECTED / EXPIRED rounds, priced from their
 *  snapshots), over the whole period. */
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
        <Cell label="Rejected" value={String(cancelled.rejected)} />
        <Cell label="Timed out" value={String(cancelled.timedOut)} />
        <Cell label="Not charged" value={formatAmount(cancelled.notCharged)} />
      </Stack>
    </Card>
  );
}
