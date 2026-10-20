"use client";

import { useEffect, useState } from "react";
import { Alert, IconButton, useMediaQuery } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { reducedMotionQuery } from "@/app/lib/theme/sharedThemeTokens";

/** How long the note stays before it fades out on its own. */
const SHOW_MS = 4000;
/** The fade-out (DESIGN.md Rule 4: a one-time notice, opacity only). */
const FADE_MS = 220;

/**
 * The short-lived "Scanned ✓" note after a QR scan: shown, then after
 * ~4s it fades out (opacity, ease-out) and only THEN leaves the layout —
 * no height animation; what's below moves up once. × closes it the same
 * way. With reduced motion it is simply removed. role="status" so the
 * words are announced.
 */
export default function ScannedNotice({
  message,
  closeLabel,
  severity = "success",
}: {
  message: string;
  closeLabel: string;
  /** "info" for a pointer rather than a success (OpenPlaceNotice). */
  severity?: "success" | "info";
}) {
  const reduceMotion = useMediaQuery(reducedMotionQuery);
  const [phase, setPhase] = useState<"shown" | "fading" | "gone">("shown");

  // Hidden = straight gone under reduced motion, else a fade first.
  const hiddenPhase = reduceMotion ? "gone" : "fading";
  function hide() {
    setPhase(hiddenPhase);
  }

  useEffect(() => {
    if (phase !== "shown") return;
    const timer = window.setTimeout(() => setPhase(hiddenPhase), SHOW_MS);
    return () => window.clearTimeout(timer);
  }, [phase, hiddenPhase]);

  if (phase === "gone") return null;

  return (
    <Alert
      severity={severity}
      role="status"
      onTransitionEnd={(event) => {
        if (event.propertyName === "opacity" && phase === "fading") {
          setPhase("gone");
        }
      }}
      action={
        <IconButton
          aria-label={closeLabel}
          onClick={hide}
          sx={{ width: 44, height: 44 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      }
      sx={{
        mb: 2,
        alignItems: "center",
        opacity: phase === "fading" ? 0 : 1,
        transition: `opacity ${FADE_MS}ms ease-out`,
      }}
    >
      {message}
    </Alert>
  );
}
