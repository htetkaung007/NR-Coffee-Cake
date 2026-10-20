"use client";

import { useId, useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Box,
  Button,
  ButtonBase,
  Popover,
  Stack,
  Switch,
  Typography,
} from "@mui/material";
import PublicOutlinedIcon from "@mui/icons-material/PublicOutlined";
import { setOnlineMenuAction } from "@/app/backoffice/locations/action";
import { hoverCapableMedia } from "../lib/theme/sharedThemeTokens";
import StatusSnackbar, { type StatusMessage } from "./StatusSnackbar";
import { useStaffErrorMessage } from "../lib/hooks/useStaffWords";

/** The selected location as the top bar reads it (one read —
 *  LocationService.getTopBarLocation). */
export interface TopBarLocation {
  id: number;
  name: string;
  onlineMenuEnabled: boolean;
}

/** The status dot: success when on, neutral (text.secondary) when off —
 *  never red, off is the normal default (DESIGN.md Rule 13). Decorative:
 *  the words (or the aria-label) say the state. */
function StatusDot({ on }: { on: boolean }) {
  return (
    <Box
      component="span"
      aria-hidden
      sx={{
        width: 8,
        height: 8,
        borderRadius: "50%",
        flexShrink: 0,
        bgcolor: on ? "success.main" : "text.secondary",
      }}
    />
  );
}

/**
 * The top bar's online menu status for the SELECTED location: a dot and
 * "Online menu" (on, palette.successText) / "Online menu off" (neutral);
 * below sm, the dot and a globe icon with an aria-label. It opens a
 * Popover — for the owner, the same switch as the location page
 * (setOnlineMenuAction: owner only, Zod); for a manager, the status and
 * "Only the owner can change this." (display only — the action refuses
 * managers anyway).
 */
export default function OnlineMenuStatus({
  location,
  canChange,
}: {
  location: TopBarLocation;
  /** The owner (ADMIN) — shows the switch. */
  canChange: boolean;
}) {
  const t = useTranslations("bo.onlineMenu");
  const errorText = useStaffErrorMessage();
  const router = useRouter();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [message, setMessage] = useState<StatusMessage | null>(null);
  const [isSaving, startSaving] = useTransition();
  // Shows the new state at once while it saves; falls back to the
  // server's (location.onlineMenuEnabled) once the refresh lands — or
  // straight away if the save fails.
  const [enabled, setOptimisticEnabled] = useOptimistic(location.onlineMenuEnabled);
  const popoverId = useId();
  const titleId = useId();
  const helperId = useId();

  const stateLabel = enabled ? t("stateOn") : t("stateOff");

  function handleToggle() {
    const next = !enabled;
    startSaving(async () => {
      setOptimisticEnabled(next);
      const result = await setOnlineMenuAction(location.id, next);
      if (!result.success) {
        setMessage({ text: errorText(result.error), severity: "error" });
        return;
      }
      router.refresh();
    });
  }

  return (
    <>
      <ButtonBase
        onClick={(event) => setAnchor(event.currentTarget)}
        aria-label={t("chipLabel", { state: stateLabel, name: location.name })}
        aria-haspopup="dialog"
        aria-expanded={anchor !== null}
        aria-controls={anchor ? popoverId : undefined}
        sx={(theme) => ({
          minHeight: 44,
          minWidth: 44,
          px: 0.5,
          borderRadius: 999,
          "&.Mui-focusVisible": {
            outline: `2px solid ${theme.palette.primary.main}`,
            outlineOffset: 2,
          },
          [hoverCapableMedia]: {
            "&:hover > span": { bgcolor: "action.hover" },
          },
        })}
      >
        {/* The visible chip — smaller than the 44px hit area around it. */}
        <Box
          component="span"
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            height: 32,
            px: 1.25,
            borderRadius: 999,
            border: 1,
            borderColor: "divider",
            transition: "background-color 150ms ease",
          }}
        >
          <StatusDot on={enabled} />
          <PublicOutlinedIcon
            aria-hidden
            fontSize="small"
            sx={{ display: { xs: "block", sm: "none" }, color: "text.secondary" }}
          />
          <Typography
            component="span"
            variant="body2"
            noWrap
            sx={(theme) => ({
              display: { xs: "none", sm: "block" },
              color: enabled
                ? theme.palette.successText
                : theme.palette.text.secondary,
            })}
          >
            {enabled ? t("chipOn") : t("stateOff")}
          </Typography>
        </Box>
      </ButtonBase>

      <Popover
        id={popoverId}
        open={anchor !== null}
        anchorEl={anchor}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
        transformOrigin={{ vertical: "top", horizontal: "left" }}
        slotProps={{
          paper: {
            role: "dialog",
            "aria-labelledby": titleId,
            sx: { p: 2, width: 320, maxWidth: "calc(100vw - 32px)" },
          },
        }}
      >
        <Typography
          id={titleId}
          variant="subtitle2"
          sx={{ overflowWrap: "anywhere", mb: 1 }}
        >
          {location.name}
        </Typography>

        {canChange ? (
          <>
            <Stack
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between", gap: 1 }}
            >
              <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
                <StatusDot on={enabled} />
                <Typography variant="body2">{stateLabel}</Typography>
              </Stack>
              <Switch
                checked={enabled}
                disabled={isSaving}
                onChange={handleToggle}
                slotProps={{
                  input: {
                    "aria-label": t("switchLabel"),
                    "aria-describedby": helperId,
                  },
                }}
              />
            </Stack>
            <Typography
              id={helperId}
              variant="caption"
              color="text.secondary"
              component="p"
              sx={{ mt: 0.5 }}
            >
              {t("helper")}
            </Typography>
            <Button
              component={Link}
              href={`/backoffice/locations/${location.id}`}
              onClick={() => setAnchor(null)}
              variant="text"
              sx={{ mt: 1, minHeight: 44, px: 0 }}
            >
              {t("locationSettings")}
            </Button>
          </>
        ) : (
          <>
            <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
              <StatusDot on={enabled} />
              <Typography variant="body2">{stateLabel}</Typography>
            </Stack>
            <Typography
              variant="caption"
              color="text.secondary"
              component="p"
              sx={{ mt: 0.5 }}
            >
              {t("ownerOnly")}
            </Typography>
          </>
        )}
      </Popover>

      <StatusSnackbar message={message} onClose={() => setMessage(null)} />
    </>
  );
}
