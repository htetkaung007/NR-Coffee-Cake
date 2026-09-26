"use client";

import { useId } from "react";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import type { EntryBill } from "@/app/lib/orderTotals";
import { countLabel, formatAmount } from "@/app/lib/orderFormat";
import PrintBillButton from "../PrintBillButton";
import RoundSection from "./RoundSection";

interface BillContentProps {
  bill: EntryBill;
  /** False while an action is in flight or a round awaits approval. */
  canPay: boolean;
  /** Why Mark as paid is off because of pending rounds; null otherwise. */
  payBlockedReason: string | null;
  onMarkPaid: () => void;
  /** This entry's key — for the printable bill's URL. */
  entryKey: string;
  /** From canPrintBill — pending rounds don't block printing. */
  canPrint: boolean;
  /** Given in the drawer/sheet — shows a close (×) button. */
  onClose?: () => void;
}

/**
 * The entry's bill — the ONE markup behind the wide-screen side panel,
 * the tablet side drawer and the phone bottom sheet. A flex column:
 * the header and the footer (total + Mark as paid) stay put, only the
 * lines between them scroll, so the button is always reachable however
 * long the bill gets. Rounds awaiting approval are listed apart with
 * their amount and are never part of the total.
 */
export default function BillContent({
  bill,
  canPay,
  payBlockedReason,
  onMarkPaid,
  entryKey,
  canPrint,
  onClose,
}: BillContentProps) {
  // Unique per instance — the panel and the drawer can both be mounted.
  const reasonId = useId();
  const printReasonId = useId();

  return (
    <Box
      sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}
    >
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", px: 2, pt: 2 }}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography component="h2" variant="h6">
            Bill
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {countLabel(
              bill.acceptedRounds.length,
              "accepted order",
              "accepted orders",
            )}
          </Typography>
        </Box>
        {onClose && (
          <IconButton
            aria-label="Close bill"
            onClick={onClose}
            sx={{ width: 44, height: 44 }}
          >
            <CloseIcon />
          </IconButton>
        )}
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2, pb: 2 }}>
        {bill.acceptedRounds.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ pt: 2 }}>
            Nothing accepted yet.
          </Typography>
        )}

        {bill.acceptedRounds.map((round) => (
          <RoundSection key={round.orderNumber} round={round} />
        ))}

        {bill.pendingRounds.map((round) => (
          <Stack
            key={round.orderNumber}
            direction="row"
            spacing={1}
            sx={(theme) => ({
              alignItems: "center",
              mt: 2,
              px: 1,
              py: 1,
              borderRadius: 1,
              bgcolor: alpha(theme.palette.warning.main, 0.12),
            })}
          >
            <HourglassEmptyIcon
              fontSize="small"
              aria-hidden
              sx={{ color: "warning.main" }}
            />
            <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }}>
              Waiting approval {round.orderNumber}
            </Typography>
            <Typography variant="body2" sx={{ flexShrink: 0 }}>
              +{formatAmount(round.amount)}
            </Typography>
          </Stack>
        ))}
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <Stack
          direction="row"
          spacing={2}
          sx={{
            justifyContent: "space-between",
            alignItems: "baseline",
            mb: 2,
          }}
        >
          <Typography variant="body1">Total</Typography>
          <Typography component="p" variant="h5">
            {formatAmount(bill.total)}
          </Typography>
        </Stack>
        {/* Print beside Mark as paid from sm up, above it on phones.
            Printing never settles anything — Mark as paid stays the
            primary (and only) payment action. */}
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
          <PrintBillButton
            variant="full"
            entryKey={entryKey}
            disabled={!canPrint}
            reasonId={printReasonId}
          />
          <Button
            fullWidth
            variant="contained"
            color="primary"
            disabled={!canPay}
            aria-describedby={payBlockedReason ? reasonId : undefined}
            onClick={onMarkPaid}
            sx={{ minHeight: 44 }}
          >
            Mark as paid
          </Button>
        </Stack>
        {!canPrint && (
          <Typography
            id={printReasonId}
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            Nothing to print yet
          </Typography>
        )}
        {payBlockedReason && (
          <Typography
            id={reasonId}
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            {payBlockedReason}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
