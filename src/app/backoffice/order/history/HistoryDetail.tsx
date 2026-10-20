"use client";

import { Box, Button, Divider, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import HighlightOffIcon from "@mui/icons-material/HighlightOff";
import StatusChip from "../[entryKey]/StatusChip";
import RoundSection from "../[entryKey]/RoundSection";
import { useTranslations } from "next-intl";
import { useHistoryWords } from "./useHistoryWords";
import {
  formatCancelNoteLine,
  formatCancelReasonLabel,
  formatCancelWait,
  formatDurationMinutes,
  formatTimeRange,
} from "./historyFormat";
import type { CancelledRoundDetail, PaidBillDetail } from "./action";
import BillTotal from "../BillTotal";
import PrintBillButton from "../PrintBillButton";

interface HistoryDetailProps {
  tab: "paid" | "cancelled";
  detail: PaidBillDetail | CancelledRoundDetail | null;
  isLoading: boolean;
  errorMessage: string | null;
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
  onRetry,
  onClose,
}: HistoryDetailProps) {
  const t = useTranslations("bo.history");
  const tCommon = useTranslations("bo.common");
  const words = useHistoryWords();
  if (isLoading) return <DetailSkeleton />;

  if (errorMessage) {
    return (
      <Stack spacing={1.5} sx={{ alignItems: "center", p: 3 }}>
        <Typography color="text.secondary">{errorMessage}</Typography>
        <Button variant="outlined" onClick={onRetry}>
          {tCommon("retry")}
        </Button>
      </Stack>
    );
  }

  if (!detail) {
    return (
      <Stack spacing={1} sx={{ alignItems: "center", p: 4 }}>
        <Typography color="text.secondary">
          {t("selectRow")}
        </Typography>
      </Stack>
    );
  }

  const isPaid = tab === "paid" && "billNumber" in detail;
  const paid = isPaid ? (detail as PaidBillDetail) : null;
  const cancelled = !isPaid ? (detail as CancelledRoundDetail) : null;

  const title = (paid ? paid.title : cancelled?.title) ?? tCommon("counter");
  // A recorded rejection: the cashier's note (Other only) and how long
  // the customer waited for it.
  const noteLine = cancelled
    ? formatCancelNoteLine(cancelled.reason, cancelled.cancellation, words)
    : null;
  const waitLine = cancelled
    ? formatCancelWait(cancelled.reason, cancelled.cancellation, words)
    : null;
  const isCounter = paid ? paid.isCounter : (cancelled?.isCounter ?? false);
  const dateLine = paid
    ? t("dateLine", {
        date: words.shopDate(paid.paidAt),
        range: formatTimeRange(paid.startedAt, paid.paidAt, words),
      })
    : cancelled
      ? t("dateLine", {
          date: words.shopDate(cancelled.cancelledAt),
          range: formatTimeRange(cancelled.createdAt, cancelled.cancelledAt, words),
        })
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
          {/* Wraps, so a long "Rejected · …" chip drops below the title on
             a narrow phone instead of overflowing. */}
          <Stack
            direction="row"
            useFlexGap
            sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
          >
            {/* Same as the Order detail page's bill title (BillContent). */}
            <Typography component="h2" variant="h6" noWrap>
              {title}
            </Typography>
            {paid ? (
              <StatusChip tone="success" icon={<CheckIcon />} label={t("paid")} />
            ) : (
              <StatusChip
                tone="error"
                icon={<HighlightOffIcon />}
                label={formatCancelReasonLabel(
                  cancelled?.reason ?? "",
                  cancelled?.cancellation ?? null,
                  words,
                )}
              />
            )}
          </Stack>
          <Typography variant="body2" color="text.secondary">
            {dateLine}
          </Typography>
        </Box>
        {onClose && (
          <IconButton
            aria-label={t("closeDetails")}
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
            <Typography variant="body2">
              {t(isCounter ? "paidAtCounter" : "paidAtTable", {
                time: words.clockTime(paid.paidAt),
                duration: formatDurationMinutes(paid.startedAt, paid.paidAt, words),
              })}
            </Typography>
          </Box>
        )}
        {/* Plain text (React escapes it), wrapped in full — never cut. */}
        {noteLine && (
          <Typography
            variant="body2"
            sx={{ mb: 0.5, overflowWrap: "anywhere", whiteSpace: "normal" }}
          >
            {noteLine}
          </Typography>
        )}
        {waitLine && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
            {waitLine}
          </Typography>
        )}
        <BillTotal
          label={paid ? t("totalPaid") : t("notCharged")}
          amount={paid ? paid.total : (cancelled?.amount ?? 0)}
        />
        {/* Paid bills only — a cancelled round was never a bill. Under
           the total, the same spacing as BillContent's footer. */}
        {paid && (
          <Box sx={{ mt: 2 }}>
            <PrintBillButton variant="full" billId={paid.id} />
          </Box>
        )}
      </Box>
    </Box>
  );
}
