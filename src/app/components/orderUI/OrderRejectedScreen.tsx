"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

import type { ShownCancelReason } from "@/app/lib/order/roundOutcome";
import OutcomeScreenShell from "./OutcomeScreenShell";
import { visuallyHiddenSx } from "@/app/lib/theme/sharedThemeTokens";

/** The heading's message: the counter's decision, or a customer's own
 *  cancel. (What happened is cancelReason.<REASON>.) */
function titleKey(reason: ShownCancelReason) {
  return reason === "WITHDRAWN" ? "cancelledTitle" : "notAcceptedTitle";
}

interface OrderRejectedScreenProps {
  /** The round's own number. */
  orderNumber: string;
  reason: ShownCancelReason;
  /** The flow's next step, under the reason (Counter: the items are back
   *  in the cart; Table: add items and send again). */
  nextStep: string;
  primaryLabel: string;
  onPrimary: () => void;
  /** Optional second way out (Counter: "Back to menu"). */
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Back arrow — returns to the menu. */
  onBack: () => void;
}

/**
 * The cart page's view of a round the counter turned down, didn't
 * confirm in time, or a customer cancelled while it waited (see
 * shownCancelReason) — the counterpart of
 * OrderConfirmedScreen, in the same visual language. Warning, not error:
 * nothing is broken, the customer just needs to look again. Shown until
 * the customer moves on (each caller remembers that per round).
 */
export default function OrderRejectedScreen({
  orderNumber,
  reason,
  nextStep,
  primaryLabel,
  onPrimary,
  secondaryLabel,
  onSecondary,
  onBack,
}: OrderRejectedScreenProps) {
  // Filled just after mount: a live region inserted with its text already
  // in it isn't reliably announced, a change to an existing one is.
  const t = useTranslations("outcome");
  const tReason = useTranslations("cancelReason");
  const title = t(titleKey(reason));
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => setAnnouncement(title), 100);
    return () => clearTimeout(timeout);
  }, [title]);

  return (
    <OutcomeScreenShell
      onBack={onBack}
      tone="warning"
      icon={<ErrorOutlineRoundedIcon aria-hidden sx={{ fontSize: 52 }} />}
      beforeContent={
        <Box
          role="status"
          aria-live="polite"
          sx={visuallyHiddenSx}
        >
          {announcement}
        </Box>
      }
    >
      <Typography
        variant="h6"
        component="h1"
        sx={{ mb: 1, textAlign: "center" }}
      >
        {title}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center", mb: 1 }}
      >
        {tReason(reason, { number: orderNumber })}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center", mb: 3 }}
      >
        {nextStep}
      </Typography>

      <Stack spacing={1.5} sx={{ width: "100%" }}>
        {secondaryLabel && onSecondary && (
          <Button
            variant="outlined"
            fullWidth
            onClick={onSecondary}
            sx={{ borderRadius: 999, py: 1.25, minHeight: 44 }}
          >
            {secondaryLabel}
          </Button>
        )}
        <Button
          variant="contained"
          fullWidth
          onClick={onPrimary}
          sx={{ borderRadius: 999, py: 1.25, minHeight: 44 }}
        >
          {primaryLabel}
        </Button>
      </Stack>
    </OutcomeScreenShell>
  );
}
