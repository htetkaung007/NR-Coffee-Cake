"use client";

import { useId, useState } from "react";
import {
  IconButton,
  Popover,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import TuneIcon from "@mui/icons-material/Tune";
import { useTranslations } from "next-intl";
import SidePanelDrawer from "@/app/components/SidePanelDrawer";
import AlertSettingsPanel, {
  type AlertSettingsPanelProps,
} from "./AlertSettingsPanel";

type SettingsProps = Omit<AlertSettingsPanelProps, "onClose" | "titleId">;

interface OrderSoundToggleProps extends SettingsProps {
  enabled: boolean;
  /** Sound is on but the browser hasn't allowed audio yet (a reloaded
   *  page needs one tap/keypress first). */
  isLocked: boolean;
  onToggle: () => void;
}

const SETTINGS_ID = "order-alert-settings";
/** The popover's width; never wider than the screen. */
const POPOVER_WIDTH = 340;

/** Bell that turns the new-order alert on/off, plus an "Alert settings"
 *  button (disabled while the bell is off) — volume, sound and repeat
 *  for this device (AlertSettingsPanel). A popover from sm; a bottom
 *  sheet on phones, where a popover hung off the header would cover
 *  most of the screen (SidePanelDrawer, drag down to close). The bell's
 *  icon itself changes (active vs crossed-out), so the state isn't
 *  carried by color. */
export default function OrderSoundToggle({
  enabled,
  isLocked,
  onToggle,
  ...settings
}: OrderSoundToggleProps) {
  const t = useTranslations("bo.alerts");
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const titleId = useId();
  const [settingsAnchor, setSettingsAnchor] = useState<HTMLElement | null>(
    null,
  );
  // The bell going off (e.g. from another tab) closes the settings for
  // good — adjusting state during render, so they can't reopen on their
  // own when the bell comes back on.
  if (!enabled && settingsAnchor !== null) setSettingsAnchor(null);
  const isSettingsOpen = settingsAnchor !== null;
  const close = () => setSettingsAnchor(null);

  const panel = (
    <AlertSettingsPanel {...settings} onClose={close} titleId={titleId} />
  );

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      {isLocked && (
        <Typography variant="caption" color="text.secondary" role="status">
          {t("tapToEnableSound")}
        </Typography>
      )}
      <IconButton
        aria-label={t("soundToggle")}
        aria-pressed={enabled}
        onClick={onToggle}
        sx={{ width: 44, height: 44 }}
      >
        {enabled ? <NotificationsActiveIcon /> : <NotificationsOffIcon />}
      </IconButton>
      <IconButton
        aria-label={t("alertSettings")}
        aria-haspopup="dialog"
        aria-expanded={isSettingsOpen}
        aria-controls={isSettingsOpen ? SETTINGS_ID : undefined}
        disabled={!enabled}
        onClick={(event) => setSettingsAnchor(event.currentTarget)}
        sx={{ width: 44, height: 44 }}
      >
        <TuneIcon />
      </IconButton>

      {isPhone ? (
        <SidePanelDrawer
          open={isSettingsOpen}
          onClose={close}
          label={t("alertSettings")}
          placement="sheet"
          swipeToClose
        >
          <div id={SETTINGS_ID} style={{ display: "contents" }}>
            {panel}
          </div>
        </SidePanelDrawer>
      ) : (
        <Popover
          id={SETTINGS_ID}
          open={isSettingsOpen}
          anchorEl={settingsAnchor}
          onClose={close}
          anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
          transformOrigin={{ vertical: "top", horizontal: "right" }}
          slotProps={{
            paper: {
              role: "dialog",
              "aria-labelledby": titleId,
              sx: {
                width: POPOVER_WIDTH,
                maxWidth: "calc(100vw - 32px)",
                // Taller than the screen → its content scrolls inside.
                maxHeight: "calc(100dvh - 32px)",
                display: "flex",
                flexDirection: "column",
              },
            },
          }}
        >
          {panel}
        </Popover>
      )}
    </Stack>
  );
}
