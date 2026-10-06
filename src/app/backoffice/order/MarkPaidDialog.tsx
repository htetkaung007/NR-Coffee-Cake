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
import { countLabel, formatAmountParts } from "@/app/lib/orderFormat";
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
      <DialogTitle id={titleId}>Mark {title} as paid?</DialogTitle>
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
            Total to collect
          </Typography>
          {/* Big number, small currency — one line of plain text, so it
             reads as "4,570 MMK" (the space is a real text node). */}
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
              {amount.currency}
            </Typography>
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {title} · {countLabel(orderCount, "order", "orders")}
          </Typography>
        </Box>
        <DialogContentText id={warningId}>
          This can&apos;t be undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel} sx={{ minHeight: 44 }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="success"
          onClick={onConfirm}
          autoFocus
          sx={{ minHeight: 44 }}
        >
          Mark as paid
        </Button>
      </DialogActions>
    </Dialog>
  );
}
