"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Stack, Typography, useMediaQuery } from "@mui/material";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { useTheme } from "@mui/material/styles";
import { useAutoRefresh } from "@/app/lib/hooks/useAutoRefresh";
import { ASK_OWNER_HINTS } from "@/app/lib/permissions";
import { useCan } from "@/app/components/StaffAccessProvider";
import type { RejectReason } from "@/app/lib/rejectReason";
import { canPrintBill, type EntryBill } from "@/app/lib/orderTotals";
import { formatAmount, formatMoneyDelta } from "@/app/lib/orderFormat";
import {
  acceptCounterSessionAction,
  markEntryPaidAction,
  rejectCounterSessionAction,
} from "../action";
import MarkPaidDialog from "../MarkPaidDialog";
import OrderBottomBar from "../OrderBottomBar";
import SidePanelDrawer from "@/app/components/SidePanelDrawer";
import OrderSidePanel from "../OrderSidePanel";
import BillContent from "./BillContent";
import EntryHeader from "./EntryHeader";
import type { Round } from "./RoundCard";
import RoundTimeline from "./RoundTimeline";

interface OrderDetailViewProps {
  /** This entry's key — see OrderSessionApprovalService.entryKeyFor. */
  entryKey: string;
  title: string;
  isTableGroup: boolean;
  /** ISO time of the entry's first round. */
  startedAt: string;
  /** Awaiting approval first, then newest first — see page.tsx. */
  rounds: Round[];
  bill: EntryBill;
  /** Every open round — Mark as paid settles them together. */
  sessionIds: number[];
}

/**
 * One Order List entry in full: the rounds as a timeline, the bill
 * beside it (lg+) or behind "View bill" (below lg). Mark as paid stays
 * off while any round awaits approval — the same rule as the list's
 * Paid button — and says which round is holding it up.
 */
export default function OrderDetailView({
  entryKey,
  title,
  isTableGroup,
  startedAt,
  rounds,
  bill,
  sessionIds,
}: OrderDetailViewProps) {
  const router = useRouter();
  const theme = useTheme();
  const isWide = useMediaQuery(theme.breakpoints.up("lg"));
  const [isPending, startTransition] = useTransition();
  const [isBillOpen, setIsBillOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  // A new round on this table appears (with its own Accept/Reject)
  // without the cashier leaving and re-opening the page.
  useAutoRefresh();

  function runAction(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  // The dialog needs the action's answer (to close, or to show the
  // error), so this one doesn't go through runAction.
  async function rejectRound(
    sessionId: number,
    reason: RejectReason,
    note?: string,
  ) {
    const result = await rejectCounterSessionAction({
      sessionId,
      rejectReason: reason,
      note,
    });
    if (result.success) startTransition(() => router.refresh());
    return result;
  }

  function handleMarkPaid() {
    setIsConfirmOpen(false);
    setIsBillOpen(false);
    // Once paid the entry is gone, so the refresh lands back on the
    // Order List (page.tsx redirects).
    runAction(() => markEntryPaidAction(sessionIds));
  }

  const pendingNumbers = bill.pendingRounds.map((round) => round.orderNumber);
  // Display only — markEntryPaidAction checks the permission itself.
  const canTakePayment = useCan("ORDERS_MARK_PAID");
  const payBlockedReason = !canTakePayment
    ? ASK_OWNER_HINTS.ORDERS_MARK_PAID
    : pendingNumbers.length > 0
      ? `Accept or reject ${pendingNumbers.length === 1 ? "order" : "orders"} ${pendingNumbers.join(", ")} first`
      : null;

  function renderBill(onClose?: () => void) {
    return (
      <BillContent
        bill={bill}
        canPay={!isPending && !payBlockedReason}
        payBlockedReason={payBlockedReason}
        onMarkPaid={() => setIsConfirmOpen(true)}
        entryKey={entryKey}
        canPrint={canPrintBill(rounds)}
        onClose={onClose}
      />
    );
  }

  return (
    // minHeight keeps the bottom bar at the bottom of the viewport even
    // when there are only a couple of rounds.
    <Stack
      sx={{
        minHeight: { xs: "calc(100vh - 64px)", md: "calc(100vh - 112px)" },
      }}
    >
      <Box sx={{ flexGrow: 1, p: { xs: 1, sm: 2, md: 0 } }}>
        <EntryHeader
          title={title}
          isTableGroup={isTableGroup}
          orderCount={rounds.length}
          startedAt={startedAt}
          pendingCount={bill.pendingRounds.length}
        />

        <Stack
          direction="row"
          useFlexGap
          sx={{ gap: 3, alignItems: "flex-start" }}
        >
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <RoundTimeline
              rounds={rounds}
              isTableGroup={isTableGroup}
              startedAt={startedAt}
              isPending={isPending}
              onAccept={(sessionId) =>
                runAction(() => acceptCounterSessionAction(sessionId))
              }
              onReject={rejectRound}
            />
          </Box>
          <OrderSidePanel label="Bill" showFrom="lg" width={360}>
            {renderBill()}
          </OrderSidePanel>
        </Stack>
      </Box>

      <OrderBottomBar
        hideFrom="lg"
        actionLabel="View bill"
        onAction={() => setIsBillOpen(true)}
      >
        <Typography variant="body2" color="text.secondary">
          Total to pay
        </Typography>
        <Typography component="p" variant="h5">
          {formatAmount(bill.total)}
        </Typography>
        {bill.pendingAmount > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <HourglassEmptyIcon
              fontSize="small"
              aria-hidden
              sx={{ color: "warning.main" }}
            />
            <Typography variant="body2" color="text.secondary">
              {formatMoneyDelta(bill.pendingAmount)} waiting approval
            </Typography>
          </Stack>
        )}
      </OrderBottomBar>

      <SidePanelDrawer
        label="Bill"
        // Never over the side panel if the window widens while it's open.
        open={isBillOpen && !isWide}
        onClose={() => setIsBillOpen(false)}
      >
        {renderBill(() => setIsBillOpen(false))}
      </SidePanelDrawer>

      <MarkPaidDialog
        open={isConfirmOpen}
        title={title}
        orderCount={sessionIds.length}
        total={bill.total}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleMarkPaid}
      />
    </Stack>
  );
}
