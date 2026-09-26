"use client";

import Link from "next/link";
import { Button, Snackbar, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import type { NewPendingRoundsEvent } from "../OrderAlertsProvider";

export interface NewOrderNotice {
  /** Changes for every notice, so a new one restarts the toast's timer
   *  instead of inheriting the old one's remaining time. */
  id: number;
  message: string;
  /** The entry's detail page when the notice is about a single entry. */
  href: string | null;
}

const AUTO_HIDE_MS = 5000;

/** The toast text for one refresh's worth of new rounds. Several
 *  entries arriving together become ONE combined message (no stack of
 *  toasts) with no single page to link to. */
export function describeNewRounds(
  event: NewPendingRoundsEvent,
): Omit<NewOrderNotice, "id"> {
  if (event.entries.length === 1) {
    const [entry] = event.entries;
    // A brand-new Counter bill is a new order; a Table entry, or a
    // Counter card that already existed ("Order More"), is a new round
    // on something the cashier already knows.
    const message =
      !entry.isTableGroup && entry.isNewEntry
        ? `New order: ${entry.title}`
        : `${entry.title} — new round`;
    return { message, href: `/backoffice/order/${entry.key}` };
  }
  return {
    message: `${event.roundCount} new orders need approval`,
    href: null,
  };
}

interface NewOrderToastProps {
  notice: NewOrderNotice | null;
  open: boolean;
  onClose: () => void;
}

/** Bottom-right on md+, bottom-center below. `notice` stays set after
 *  `open` goes false so the text doesn't vanish mid exit transition. */
export default function NewOrderToast({
  notice,
  open,
  onClose,
}: NewOrderToastProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  return (
    <Snackbar
      key={notice?.id}
      open={open}
      autoHideDuration={AUTO_HIDE_MS}
      onClose={(_event, reason) => {
        // A tap elsewhere on the page shouldn't dismiss an alert the
        // cashier hasn't read yet.
        if (reason === "clickaway") return;
        onClose();
      }}
      anchorOrigin={{
        vertical: "bottom",
        horizontal: isDesktop ? "right" : "center",
      }}
      message={notice?.message}
      action={
        notice?.href ? (
          <Button
            component={Link}
            href={notice.href}
            color="inherit"
            size="small"
            onClick={onClose}
            sx={{ minHeight: 44 }}
          >
            View
          </Button>
        ) : undefined
      }
      sx={{
        bottom: {
          xs: "calc(12px + env(safe-area-inset-bottom, 0px))",
          sm: "calc(24px + env(safe-area-inset-bottom, 0px))",
        },
      }}
    />
  );
}
