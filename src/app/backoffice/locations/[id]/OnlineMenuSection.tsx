"use client";

import { useEffect, useId, useOptimistic, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Button, Switch, Typography } from "@mui/material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import { onlineMenuLink } from "@/app/lib/location/onlineMenu";
import { setOnlineMenuAction } from "../action";

/** How long "Copied" shows on the Copy button. */
const COPIED_MS = 2000;

interface OnlineMenuSectionProps {
  locationId: number;
  enabled: boolean;
  /** config.publicBaseUrl — the full link with it, the path only
   *  without (lib/location/onlineMenu.onlineMenuLink). */
  publicBaseUrl: string;
  /** A closed location can't be switched on (the action refuses too). */
  isArchived: boolean;
}

/**
 * The location's "Online menu" switch (owner only — setOnlineMenuAction).
 * The online menu is the customer menu page itself: on, anyone with its
 * link can see it; off, only customers who scanned the QR in the shop can
 * (lib/storefront/menuAccess). Shows the link with Copy while it's on.
 */
export default function OnlineMenuSection({
  locationId,
  enabled: savedEnabled,
  publicBaseUrl,
  isArchived,
}: OnlineMenuSectionProps) {
  const router = useRouter();
  // Follows the server's value (so a switch from the top bar's status
  // chip shows here too), showing the new state at once while it saves.
  const [enabled, setOptimisticEnabled] = useOptimistic(savedEnabled);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [isSaving, startSaving] = useTransition();
  const titleId = useId();
  const helperId = useId();

  useEffect(() => {
    if (copyState !== "copied") return;
    const timer = window.setTimeout(() => setCopyState("idle"), COPIED_MS);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  const link = onlineMenuLink(locationId, publicBaseUrl);
  const hasOnlineAddress = publicBaseUrl.trim() !== "";
  // Switching on a closed location is refused; switching off still works.
  const switchDisabled = isSaving || (isArchived && !enabled);

  function handleToggle() {
    setError(null);
    const next = !enabled;
    startSaving(async () => {
      setOptimisticEnabled(next);
      const result = await setOnlineMenuAction(locationId, next);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.refresh();
    });
  }

  async function handleCopy() {
    try {
      // Needs a secure context (https or localhost) — on a plain-http
      // LAN address it isn't there, and the owner copies by hand.
      await navigator.clipboard.writeText(link);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <Box
      component="section"
      aria-labelledby={titleId}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        p: { xs: 2, sm: 3 },
        mb: 3,
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="body2" id={titleId}>
            Online menu
          </Typography>
          <Typography
            variant="caption"
            color="text.secondary"
            id={helperId}
            component="p"
          >
            On: anyone with the menu link can see the menu. Off: only
            customers who scanned the QR in the shop can. Ordering always
            needs the QR.
          </Typography>
          {isArchived && (
            <Typography variant="caption" color="text.secondary" component="p">
              {enabled
                ? "Not shown while this location is closed."
                : "Reopen this location to show its menu online."}
            </Typography>
          )}
        </Box>
        <Switch
          checked={enabled}
          disabled={switchDisabled}
          onChange={handleToggle}
          slotProps={{
            input: {
              "aria-labelledby": titleId,
              "aria-describedby": helperId,
            },
          }}
        />
      </Box>

      {enabled && (
        <Box sx={{ mt: 2 }}>
          <Typography
            variant="body2"
            sx={{ overflowWrap: "anywhere", mb: 1 }}
            aria-label="Menu link"
          >
            {link}
          </Typography>
          {!hasOnlineAddress && (
            <Typography
              variant="caption"
              color="text.secondary"
              component="p"
              sx={{ mb: 1 }}
            >
              Works only inside the shop until an online address is set up
            </Typography>
          )}
          <Button
            variant="outlined"
            startIcon={<ContentCopyIcon />}
            onClick={() => void handleCopy()}
            sx={{ minHeight: 44 }}
          >
            {copyState === "copied" ? "Copied" : "Copy"}
          </Button>
          {copyState === "failed" && (
            <Typography
              variant="caption"
              color="text.secondary"
              component="p"
              role="status"
              sx={{ mt: 1 }}
            >
              Couldn&apos;t copy here — select the link above and copy it.
            </Typography>
          )}
        </Box>
      )}
    </Box>
  );
}
