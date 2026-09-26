"use client";

import { Box, Button, Divider, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import StatusChip from "../[entryKey]/StatusChip";
import RoundSection from "../[entryKey]/RoundSection";
import { formatAmount, formatClockTime } from "@/app/lib/orderFormat";
import {
  formatCancelReasonLabel,
  formatDurationMinutes,
  formatShopDateLabel,
  formatTimeRange,
} from "./historyFormat";
import type { CancelledRoundDetail, PaidBillDetail } from "./action";

interface HistoryDetailProps {
  tab: "paid" | "cancelled";
  detail: PaidBillDetail | CancelledRoundDetail | null;
  isLoading: boolean;
  errorMessage: string | null;
  shopTimezone: string;
  onRetry: () => void;
  /** Given only inside the Dialog/Drawer overlay (below lg) — shows the
   *  close (×) button. The lg+ sticky panel never closes. */
  onClose?: () => void;
}

function DetailSkeleton() {
  return (
    <Stack spacing={2} sx={{ p: 2 }}>
      <Skeleton variant="text" width="60%" height={32} />
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="rounded" height={80} />
      <Skeleton variant="rounded" height={80} />
    </Stack>
  );
}

/**
 * One row's full breakdown — the ONE content component behind the lg+
 * sticky panel and the below-lg Dialog/Drawer (HistoryDetailPanel /
 * HistoryDetailOverlay just place it differently). Rounds render
 * through RoundSection, the exact markup the live Order List's bill
 * uses — never duplicated here.
 */
export default function HistoryDetail({
  tab,
  detail,
  isLoading,
  errorMessage,
  shopTimezone,
  onRetry,
  onClose,
}: HistoryDetailProps) {
  if (isLoading) return <DetailSkeleton />;

  if (errorMessage) {
    return (
      <Stack spacing={1.5} sx={{ alignItems: "center", p: 3 }}>
        <Typography color="text.secondary">{errorMessage}</Typography>
        <Button variant="outlined" onClick={onRetry}>
          Retry
        </Button>
      </Stack>
    );
  }

  if (!detail) {
    return (
      <Stack spacing={1} sx={{ alignItems: "center", p: 4 }}>
        <Typography color="text.secondary">
          Select a row to see its details.
        </Typography>
      </Stack>
    );
  }

  const isPaid = tab === "paid" && "billNumber" in detail;
  const paid = isPaid ? (detail as PaidBillDetail) : null;
  const cancelled = !isPaid ? (detail as CancelledRoundDetail) : null;

  const title = paid ? paid.title : (cancelled?.title ?? "");
  const isCounter = paid ? paid.isCounter : (cancelled?.isCounter ?? false);
  const dateLine = paid
    ? `${formatShopDateLabel(paid.paidAt, shopTimezone)} · ${formatTimeRange(paid.startedAt, paid.paidAt)}`
    : cancelled
      ? `${formatShopDateLabel(cancelled.cancelledAt, shopTimezone)} · ${formatTimeRange(cancelled.createdAt, cancelled.cancelledAt)}`
      : "";

  const rounds = paid
    ? paid.rounds
    : cancelled
      ? [
          {
            orderNumber: cancelled.orderNumber,
            time: cancelled.createdAt,
            lines: cancelled.lines,
          },
        ]
      : [];

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "flex-start", px: 2, pt: 2 }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography component="h2" variant="h5" noWrap>
              {title}
            </Typography>
            {paid ? (
              <StatusChip tone="success" icon={<CheckIcon />} label="Paid" />
            ) : (
              <StatusChip
                tone="error"
                icon={<HighlightOffIcon />}
                label={formatCancelReasonLabel(cancelled?.reason ?? "")}
              />
            )}
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            suppressHydrationWarning
          >
            {dateLine}
          </Typography>
        </Box>
        {onClose && (
          <IconButton
            aria-label="Close details"
            onClick={onClose}
            sx={{ width: 44, height: 44 }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Stack>

      <Divider sx={{ mt: 2 }} />

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2, pb: 2 }}>
        {rounds.map((round) => (
          <RoundSection key={round.orderNumber} round={round} />
        ))}
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        {paid && (
          <Box
            sx={(theme) => ({
              mb: 1.5,
              px: 1.5,
              py: 1,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.success.main, 0.12),
            })}
          >
            <Typography variant="body2" suppressHydrationWarning>
              Paid at {formatClockTime(paid.paidAt)} ·{" "}
              {formatDurationMinutes(paid.startedAt, paid.paidAt)} at the{" "}
              {isCounter ? "counter" : "table"}
            </Typography>
          </Box>
        )}
        <Stack
          direction="row"
          spacing={2}
          sx={{ justifyContent: "space-between", alignItems: "baseline" }}
        >
          <Typography variant="body1">
            {paid ? "Total paid" : "Not charged"}
          </Typography>
          <Typography component="p" variant="h5">
            {formatAmount(paid ? paid.total : cancelled?.amount ?? 0)}
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
