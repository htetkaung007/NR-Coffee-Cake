"use client";

import { useId } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { formatAmountParts } from "@/app/lib/orderFormat";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";
import { moneyColor, moneySx } from "./orderTypography";

interface MarkPaidDialogProps {
  open: boolean;
  /** The entry's title — table name or Counter bill number. */
  title: string;
  orderCount: number;
  total: number;
  onCancel: () => void;
  onConfirm: () => void;
}

/** "Mark … as paid?" confirmation before markEntryPaidAction — shared by
 *  the Order List card and the entry's detail page, so the wording and
 *  the Cancel / Mark as paid choice are the same in both. The amount to
 *  collect sits in its own quiet box, the number big enough to read at
 *  a glance; green only on that number and the confirm button. A screen
 *  reader reads the box in order (label, "4,570 MMK", details), then the
 *  warning. */
export default function MarkPaidDialog({
  open,
  title,
  orderCount,
  total,
  onCancel,
  onConfirm,
}: MarkPaidDialogProps) {
  const t = useTranslations("bo.markPaid");
  const tCommon = useTranslations("bo.common");
  const money = useStaffMoney();
  const titleId = useId();
  const amountId = useId();
  const warningId = useId();
  const amount = formatAmountParts(total);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      fullWidth
      maxWidth="xs"
      aria-labelledby={titleId}
      aria-describedby={`${amountId} ${warningId}`}
    >
      <DialogTitle id={titleId}>{t("title", { title })}</DialogTitle>
      <DialogContent>
        <Box
          id={amountId}
          sx={(theme) => ({
            p: 2,
            mb: 2,
            borderRadius: 2,
            // Light: a soft success tint. Dark: the page colour instead —
            // on the dialog's lighter (elevated) paper the tint drops the
            // amount to 3.6:1; on background.default it's 7.3:1.
            bgcolor:
              theme.palette.mode === "light"
                ? alpha(theme.palette.success.main, 0.08)
                : theme.palette.background.default,
          })}
        >
          <Typography
            variant="caption"
            component="p"
            color="text.secondary"
            sx={{ textTransform: "uppercase" }}
          >
            {t("totalToCollect")}
          </Typography>
          {/* Big number, small currency — one line of plain text, so it
             reads as "4,570 MMK" / "4,570 ကျပ်" (the space is a real text
             node; the word is the staff's money word). */}
          <Typography variant="h4" component="p">
            <Box
              component="span"
              sx={{
                ...moneySx,
                color: moneyColor("income"),
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {amount.value}
            </Box>{" "}
            <Typography
              variant="body1"
              component="span"
              color="text.secondary"
            >
              {money.currency}
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {t("summary", { title, orders: tCommon("orderCount", { count: orderCount }) })}
          </Typography>
        </Box>
        <DialogContentText id={warningId}>
          {t("cannotUndo")}
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} sx={{ minHeight: 44 }}>
          {tCommon("cancel")}
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={onConfirm}
          autoFocus
          sx={{ minHeight: 44 }}
        >
          {t("confirm")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
