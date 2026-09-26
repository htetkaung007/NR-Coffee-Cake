"use client";

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";

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
 *  the Cancel/Confirm choice are the same in both. */
export default function MarkPaidDialog({
  open,
  title,
  orderCount,
  total,
  onCancel,
  onConfirm,
}: MarkPaidDialogProps) {
  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Mark {title} as paid?</DialogTitle>
      <DialogContent>
        <DialogContentText>
          This settles all {orderCount} {orderCount === 1 ? "order" : "orders"}{" "}
          for {title} — {total.toLocaleString()} MMK total. This can&apos;t be
          undone.
        </DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={onConfirm} autoFocus>
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}
