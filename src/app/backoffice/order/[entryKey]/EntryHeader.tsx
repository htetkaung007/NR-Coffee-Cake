"use client";

import { Box, Stack, Typography } from "@mui/material";
import BackLink from "@/app/components/BackLink";
import StatusChip, { StatusDot } from "./StatusChip";
import { countLabel, formatClockTime } from "@/app/lib/orderFormat";

interface EntryHeaderProps {
  title: string;
  isTableGroup: boolean;
  orderCount: number;
  /** ISO time of the entry's first round. */
  startedAt: string;
  pendingCount: number;
}

/** Back button, the entry's name, "N orders · seated/started HH:MM" and —
 *  while anything awaits approval — a status chip (long wording from sm
 *  up, "N new" on phones). */
export default function EntryHeader({
  title,
  isTableGroup,
  orderCount,
  startedAt,
  pendingCount,
}: EntryHeaderProps) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
      <BackLink href="/backoffice/order" label="Back to orders" />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography component="h1" variant="h6" noWrap>
          {title}
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          suppressHydrationWarning
        >
          {countLabel(orderCount, "order", "orders")} ·{" "}
          {isTableGroup ? "seated" : "started"} {formatClockTime(startedAt)}
        </Typography>
      </Box>
      {pendingCount > 0 && (
        <StatusChip
          tone="warning"
          icon={<StatusDot />}
          label={
            <>
              <Box
                component="span"
                sx={{ display: { xs: "none", sm: "inline" } }}
              >
                {pendingCount === 1
                  ? "1 order needs approval"
                  : `${pendingCount} orders need approval`}
              </Box>
              <Box component="span" sx={{ display: { sm: "none" } }}>
                {pendingCount} new
              </Box>
            </>
          }
        />
      )}
    </Stack>
  );
}
