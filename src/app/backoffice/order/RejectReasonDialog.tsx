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
import { useTranslations } from "next-intl";
import { useStaffErrorMessage } from "@/app/lib/hooks/useStaffWords";
import type { ActionResult } from "@/app/lib/actionResult";
import {
  REJECT_NOTE_MAX_LENGTH,
  REJECT_REASONS,
  type RejectReason,
} from "@/app/lib/order/rejectReason";
import { reducedMotionMedia } from "@/app/lib/theme/sharedThemeTokens";

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

/** What both steps say first — what the customer is told, and that stock
 *  comes back — and the last action's error, if any. `id` is the dialog's
 *  aria-describedby target. */
function RejectIntro({ id, error }: { id: string; error: string | null }) {
  const t = useTranslations("bo.reject");
  return (
    <>
      <Typography
        id={id}
        variant="body2"
        color="text.secondary"
        sx={{ mb: 2 }}
      >
        {t("intro")}
      </Typography>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
    </>
  );
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
  const t = useTranslations("bo.reject");
  const tCommon = useTranslations("bo.common");
  const tReason = useTranslations("bo.rejectReason");
  const errorText = useStaffErrorMessage();
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
      setError(errorText(result.error));
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
        {t("title", { number: orderNumber })}
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
              [reducedMotionMedia]: { animation: "none" },
            }}
          >
            <RejectIntro id={descriptionId} error={error} />
            <TextField
              label={t("noteLabel")}
              placeholder={t("notePlaceholder")}
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
                  <span>{t("noteHint")}</span>
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
              {tCommon("back")}
            </Button>
            <Button
              type="submit"
              variant="contained"
              color="error"
              disabled={isPending}
              sx={{ minHeight: 44 }}
            >
              {isPending ? t("rejecting") : t("reject")}
            </Button>
          </DialogActions>
        </Box>
      ) : (
        <>
          <DialogContent>
            <RejectIntro id={descriptionId} error={error} />
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
                  {pendingReason === reason ? t("rejecting") : tReason(reason)}
                </Button>
              ))}
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={close} disabled={isPending} sx={{ minHeight: 44 }}>
              {tCommon("cancel")}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
