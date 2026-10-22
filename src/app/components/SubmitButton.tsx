"use client";

import { Button, type ButtonProps } from "@mui/material";

/** idle → the action's own label; busy → MUI's `loading` spinner + a
 *  "…ing" label; done → "✓" words, still disabled, until the page (or
 *  dialog) leaves. useSubmitLock's `status`. */
export type SubmitStatus = "idle" | "busy" | "done";

interface SubmitButtonProps extends Omit<ButtonProps, "loading" | "children"> {
  status: SubmitStatus;
  children: React.ReactNode;
  busyLabel: React.ReactNode;
  /** Default: the busy label (a dialog that just closes). */
  doneLabel?: React.ReactNode;
}

/**
 * A submit / create button that shows where its request is (DESIGN.md
 * §15). The spinner is the progress indicator; under reduced motion it
 * slows down, and the label still says "Creating…" — the static cue.
 * Disabled while busy or done (MUI disables a loading button too), so it
 * never flashes back to its idle label during the success toast.
 */
export default function SubmitButton({
  status,
  children,
  busyLabel,
  doneLabel,
  disabled,
  ...buttonProps
}: SubmitButtonProps) {
  return (
    <Button
      {...buttonProps}
      loading={status === "busy"}
      loadingPosition="start"
      disabled={disabled || status !== "idle"}
    >
      {status === "busy"
        ? busyLabel
        : status === "done"
          ? (doneLabel ?? busyLabel)
          : children}
    </Button>
  );
}
