"use client";

import { useId } from "react";
import Link from "next/link";
import AddIcon from "@mui/icons-material/Add";
import { Box, Button, IconButton, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import type { EntryBill } from "@/app/lib/order/orderTotals";
import { useTranslations } from "next-intl";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";
import BillTotal from "../BillTotal";
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
  const t = useTranslations("bo.detail");
  const tOrders = useTranslations("bo.orders");
  const money = useStaffMoney();
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
            {t("bill")}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("acceptedOrders", { count: bill.acceptedRounds.length })}
          </Typography>
        </Box>
        {onClose && (
          <IconButton
            aria-label={t("closeBill")}
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
            {/* canPrint: some round was accepted — so it was all voided
                (the bill lists only what's payable). */}
            {canPrint ? t("allVoided") : t("nothingAccepted")}
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
              {t("waitingApproval", { number: round.orderNumber })}
            </Typography>
            <Typography variant="body2" sx={{ flexShrink: 0 }}>
              {money.delta(round.amount)}
            </Typography>
          </Stack>
        ))}
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <BillTotal label={t("total")} amount={bill.total} sx={{ mb: 2 }} />
        {/* Print and Add items side by side, Mark as paid under them —
            the primary (and only) payment action. Printing never settles
            anything; Add items opens New Order for this same bill (a NEW
            round — sent rounds are never edited). The entry is open, so
            it's unpaid whenever this shows. */}
        <Stack spacing={1}>
          <Stack direction="row" spacing={1}>
            <PrintBillButton
              variant="full"
              entryKey={entryKey}
              disabled={!canPrint}
              reasonId={printReasonId}
            />
            <Button
              component={Link}
              href={`/backoffice/order/new?for=${entryKey}`}
              fullWidth
              variant="outlined"
              startIcon={<AddIcon />}
              sx={{ minHeight: 44 }}
            >
              {t("addItems")}
            </Button>
          </Stack>
          <Button
            fullWidth
            variant="contained"
            color="primary"
            disabled={!canPay}
            aria-describedby={payBlockedReason ? reasonId : undefined}
            onClick={onMarkPaid}
            sx={{ minHeight: 44 }}
          >
            {t("markAsPaid")}
          </Button>
        </Stack>
        {!canPrint && (
          <Typography
            id={printReasonId}
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            {tOrders("nothingToPrint")}
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
