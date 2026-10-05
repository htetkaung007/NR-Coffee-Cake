"use client";

import { useId, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { keyframes } from "@mui/material/styles";
import type { ActionResult } from "@/app/lib/actionResult";
import {
  REJECT_NOTE_MAX_LENGTH,
  REJECT_REASONS,
  rejectReasonLabel,
  type RejectReason,
} from "@/app/lib/rejectReason";

// The "Other" note step appears in place: a short fade + lift,
// transform/opacity only (DESIGN.md Rule 2), none under reduced motion.
const reveal = keyframes`
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
`;
const REVEAL_MS = 160;

interface RejectReasonDialogProps {
  open: boolean;
  orderNumber: string;
  onClose: () => void;
  /** Rejects the round with this reason (and, for Other, the note —
   *  possibly empty); the dialog closes on success and shows the error
   *  inside itself on failure. */
  onReject: (
    reason: RejectReason,
    note?: string,
  ) => Promise<ActionResult<unknown>>;
}

/**
 * "Why are you rejecting Order #A042?" — one full-width button per
 * reason (enum order), plus Cancel. Tapping a reason rejects at once:
 * that tap IS the confirmation for this irreversible action (DESIGN.md
 * Rule 21). Except Other: it opens an optional note in place, with Back
 * and Reject (Enter in the note = Reject). While a reject runs every
 * control is disabled and the dialog can't be dismissed. No reason is
 * focused on open, so a stray Enter can't reject; MUI moves focus into
 * the dialog and back to Reject on close.
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
  const [isWritingNote, setIsWritingNote] = useState(false);
  const [note, setNote] = useState("");
  const isPending = pendingReason !== null;

  function reset() {
    setError(null);
    setIsWritingNote(false);
    setNote("");
  }

  function close() {
    if (isPending) return;
    reset();
    onClose();
  }

  async function choose(reason: RejectReason, withNote?: string) {
    setError(null);
    setPendingReason(reason);
    const result = await onReject(reason, withNote);
    setPendingReason(null);
    if (result.success) {
      reset();
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

      {isWritingNote ? (
        <Box
          component="form"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!isPending) choose("OTHER", note);
          }}
          sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          {/* Scrolls on a short (keyboard-up) screen; the buttons below
             stay pinned under it. */}
          <DialogContent
            sx={{
              animation: `${reveal} ${REVEAL_MS}ms ease-out`,
              "@media (prefers-reduced-motion: reduce)": { animation: "none" },
            }}
          >
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
            <TextField
              label="Note (optional)"
              placeholder="e.g. coffee machine broken"
              fullWidth
              autoFocus
              value={note}
              disabled={isPending}
              onChange={(event) => setNote(event.target.value)}
              slotProps={{
                htmlInput: { maxLength: REJECT_NOTE_MAX_LENGTH },
                formHelperText: { component: "div" },
              }}
              helperText={
                <Box
                  component="span"
                  sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}
                >
                  <span>Don&apos;t include customer names or phone numbers.</span>
                  <Box component="span" sx={{ flexShrink: 0 }}>
                    {note.length}/{REJECT_NOTE_MAX_LENGTH}
                  </Box>
                </Box>
              }
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button
              onClick={() => {
                setError(null);
                setIsWritingNote(false);
              }}
              disabled={isPending}
              sx={{ minHeight: 44 }}
            >
              Back
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="error"
              disabled={isPending}
              sx={{ minHeight: 44 }}
            >
              {isPending ? "Rejecting…" : "Reject"}
            </Button>
          </DialogActions>
        </Box>
      ) : (
        <>
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
                  onClick={() => {
                    if (reason === "OTHER") {
                      setError(null);
                      setIsWritingNote(true);
                    } else {
                      choose(reason);
                    }
                  }}
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
        </>
      )}
    </Dialog>
  );
}
