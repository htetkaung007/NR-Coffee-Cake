"use client";

import { useEffect, useState } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

import type { ShownCancelReason } from "@/app/lib/order/roundOutcome";
import OutcomeScreenShell from "./OutcomeScreenShell";

const TITLE = "Your last order wasn't accepted";

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
 * The cart page's view of a round the counter turned down or didn't
 * confirm in time (see shownCancelReason) — the counterpart of
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
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    const timeout = setTimeout(() => setAnnouncement(TITLE), 100);
    return () => clearTimeout(timeout);
  }, []);

  return (
    <OutcomeScreenShell
      onBack={onBack}
      tone="warning"
      icon={<ErrorOutlineRoundedIcon aria-hidden sx={{ fontSize: 52 }} />}
      beforeContent={
        <Box
          role="status"
          aria-live="polite"
          sx={{
            position: "absolute",
            width: 1,
            height: 1,
            overflow: "hidden",
            clip: "rect(0 0 0 0)",
            whiteSpace: "nowrap",
          }}
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
        {TITLE}
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center", mb: 1 }}
      >
        {reason === "REJECTED"
          ? `Order ${orderNumber} was not accepted by the counter.`
          : `The counter didn't confirm Order ${orderNumber} in time.`}
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
