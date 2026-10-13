"use client";

import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/app/lib/hooks/useErrorMessage";
import { useState } from "react";
import { Alert, Button, Stack } from "@mui/material";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import type { ActionResult } from "@/app/lib/actionResult";

/**
 * Under the waiting countdown (Counter and Table): "Change order" — the
 * round comes back to be edited — and "Cancel order", which asks first
 * (DESIGN.md Rule 21: the counter won't make it). Both cancel the round
 * on the server (withdrawn — lib/order/withdrawal); while one runs both
 * buttons are disabled (Rule 15). If the counter decided first, the
 * server's plain answer shows here ("The counter already accepted this
 * order…") and the page's next poll moves on to that outcome.
 */
export default function WithdrawRoundControls({
  confirmMessage,
  onChange,
  onCancel,
}: {
  /** The cancel dialog's message (Table: who else it affects). */
  confirmMessage: string;
  onChange: () => Promise<ActionResult<unknown>>;
  onCancel: () => Promise<ActionResult<unknown>>;
}) {
  const t = useTranslations("withdraw");
  const errorMessage = useErrorMessage();
  const [pending, setPending] = useState<"change" | "cancel" | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run(kind: "change" | "cancel") {
    setError(null);
    setPending(kind);
    const result = await (kind === "change" ? onChange() : onCancel());
    setPending(null);
    setIsConfirmOpen(false);
    if (!result.success) setError(errorMessage(result.error));
  }

  return (
    <>
      {error && (
        <Alert severity="info" role="status" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}>
        <Button
          variant="outlined"
          disabled={pending !== null}
          onClick={() => void run("change")}
          sx={{ minHeight: 44, borderRadius: 999 }}
        >
          {pending === "change" ? t("opening") : t("change")}
        </Button>
        <Button
          color="error"
          disabled={pending !== null}
          onClick={() => setIsConfirmOpen(true)}
          sx={{ minHeight: 44, borderRadius: 999 }}
        >
          {t("cancel")}
        </Button>
      </Stack>
      <ConfirmDialog
        open={isConfirmOpen}
        title={t("confirmTitle")}
        message={confirmMessage}
        confirmLabel={t("cancel")}
        cancelLabel={t("keep")}
        pendingLabel={t("cancelling")}
        destructive
        pending={pending === "cancel"}
        onConfirm={() => void run("cancel")}
        onCancel={() => setIsConfirmOpen(false)}
      />
    </>
  );
}
