"use client";

import { useId, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from "@mui/material";
import type { ActionResult } from "@/app/lib/actionResult";
import {
  REJECT_REASONS,
  rejectReasonLabel,
  type RejectReason,
} from "@/app/lib/rejectReason";

interface RejectReasonDialogProps {
  open: boolean;
  orderNumber: string;
  onClose: () => void;
  /** Rejects the round with this reason; the dialog closes on success
   *  and shows the error inside itself on failure. */
  onReject: (reason: RejectReason) => Promise<ActionResult<unknown>>;
}

/**
 * "Why are you rejecting Order #A042?" — one full-width button per
 * reason (enum order), plus Cancel. Tapping a reason rejects at once:
 * that tap IS the confirmation for this irreversible action (DESIGN.md
 * Rule 21). While it runs every button is disabled and the dialog can't
 * be dismissed. No reason is focused on open, so a stray Enter can't
 * reject; MUI moves focus into the dialog and back to Reject on close.
 */
export default function RejectReasonDialog({
  open,
  orderNumber,
  onClose,
  onReject,
}: RejectReasonDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const [pendingReason, setPendingReason] = useState<RejectReason | null>(null);
  const [error, setError] = useState<string | null>(null);
  const isPending = pendingReason !== null;

  function close() {
    if (isPending) return;
    setError(null);
    onClose();
  }

  async function choose(reason: RejectReason) {
    setError(null);
    setPendingReason(reason);
    const result = await onReject(reason);
    setPendingReason(null);
    if (result.success) {
      onClose();
    } else {
      setError(result.error.message);
    }
  }

  return (
    <Dialog
      open={open}
      // Escape and the backdrop both come through here — ignored while
      // the reject is running.
      onClose={close}
      fullWidth
      maxWidth="xs"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      slotProps={{
        paper: {
          sx: { m: { xs: 2 }, width: { xs: "calc(100% - 32px)", sm: "100%" } },
        },
      }}
    >
      <DialogTitle id={titleId}>
        Why are you rejecting Order {orderNumber}?
      </DialogTitle>
      <DialogContent>
        <Typography
          id={descriptionId}
          variant="body2"
          color="text.secondary"
          sx={{ mb: 2 }}
        >
          The customer is told the order wasn&apos;t accepted (not why).
          Stock is returned.
        </Typography>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <Stack spacing={1}>
          {REJECT_REASONS.map((reason) => (
            <Button
              key={reason}
              variant="outlined"
              fullWidth
              disabled={isPending}
              onClick={() => choose(reason)}
              sx={{ minHeight: 48, justifyContent: "flex-start" }}
            >
              {pendingReason === reason
                ? "Rejecting…"
                : rejectReasonLabel(reason)}
            </Button>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={close} disabled={isPending} sx={{ minHeight: 44 }}>
          Cancel
        </Button>
      </DialogActions>
    </Dialog>
  );
}
