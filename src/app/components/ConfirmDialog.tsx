"use client";

import { useId, useState, type ReactNode } from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from "@mui/material";

/**
 * The one "are you sure?" dialog (DESIGN.md Rule 21 — confirm only what's
 * hard to undo): a title, an optional message, Cancel and a confirm
 * button. `destructive` makes the confirm button error-coloured and puts
 * focus on Cancel, so Enter never destroys by accident. `pending`
 * disables both buttons while the action runs (the confirm button shows
 * `pendingLabel`). `requireTypedText` adds a field the user must type
 * that exact text into before confirming (it gets the focus instead).
 * Escape / outside click cancel, unless pending.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel = "Cancel",
  destructive = false,
  pending = false,
  pendingLabel,
  requireTypedText,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: ReactNode;
  message?: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
  pending?: boolean;
  /** Shown on the confirm button while pending (default: confirmLabel). */
  pendingLabel?: string;
  /** e.g. { text: location.name, label: "Location name" }. */
  requireTypedText?: { text: string; label: string };
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const titleId = useId();
  const messageId = useId();
  const [typed, setTyped] = useState("");

  // Empty field each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setTyped("");
  }

  const isTypedTextMatched =
    !requireTypedText || typed.trim() === requireTypedText.text.trim();

  return (
    <Dialog
      open={open}
      onClose={pending ? undefined : onCancel}
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
    >
      <DialogTitle id={titleId}>{title}</DialogTitle>
      {(message || requireTypedText) && (
        <DialogContent>
          {message && (
            <DialogContentText
              id={messageId}
              sx={requireTypedText ? { mb: 2 } : undefined}
            >
              {message}
            </DialogContentText>
          )}
          {requireTypedText && (
            <TextField
              label={requireTypedText.label}
              autoFocus
              fullWidth
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              helperText={`Type: ${requireTypedText.text}`}
            />
          )}
        </DialogContent>
      )}
      <DialogActions>
        <Button
          onClick={onCancel}
          disabled={pending}
          autoFocus={destructive && !requireTypedText}
          sx={{ minHeight: 44 }}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={destructive ? "error" : "primary"}
          disabled={pending || !isTypedTextMatched}
          onClick={onConfirm}
          sx={{ minHeight: 44 }}
        >
          {pending ? (pendingLabel ?? confirmLabel) : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
