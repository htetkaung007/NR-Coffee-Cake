"use client";

import { Box, Stack, Typography } from "@mui/material";
import BackLink from "@/app/components/BackLink";
import StatusChip, { StatusDot } from "./StatusChip";
import { useTranslations } from "next-intl";
import { useClockTime } from "@/app/lib/hooks/useStaffWords";

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
  const t = useTranslations("bo.detail");
  const tCommon = useTranslations("bo.common");
  const clockTime = useClockTime();
  const orders = tCommon("orderCount", { count: orderCount });
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
      <BackLink href="/backoffice/order" label={t("backToOrders")} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography component="h1" variant="h6" noWrap>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {t(isTableGroup ? "seatedAt" : "startedAt", {
            orders,
            time: clockTime(startedAt),
          })}
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
                {t("pendingLong", { count: pendingCount })}
              </Box>
              <Box component="span" sx={{ display: { sm: "none" } }}>
                {t("pendingShort", { count: pendingCount })}
              </Box>
            </>
          }
        />
      )}
    </Stack>
  );
}
