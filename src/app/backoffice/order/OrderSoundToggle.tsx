"use client";

import { useState } from "react";
import {
  Box,
  IconButton,
  Popover,
  Slider,
  Stack,
  Typography,
} from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { MAX_VOLUME, MIN_VOLUME } from "@/app/lib/hooks/useOrderAlertSound";

interface OrderSoundToggleProps {
  enabled: boolean;
  /** Sound is on but the browser hasn't allowed audio yet (a reloaded
   *  page needs one tap/keypress first). */
  isLocked: boolean;
  onToggle: () => void;
  /** Integer percent, MIN_VOLUME–MAX_VOLUME. */
  volume: number;
  onVolumeChange: (percent: number) => void;
  /** One beep at the current volume. */
  onTestBeep: () => void;
}

const VOLUME_POPOVER_ID = "order-alert-volume";

/** Bell that turns the new-order beep on/off, plus a volume button
 *  (disabled while the bell is off) opening a slider. The bell's icon
 *  itself changes (active vs crossed-out), so the state isn't carried
 *  by color. */
export default function OrderSoundToggle({
  enabled,
  isLocked,
  onToggle,
  volume,
  onVolumeChange,
  onTestBeep,
}: OrderSoundToggleProps) {
  const [volumeAnchor, setVolumeAnchor] = useState<HTMLElement | null>(null);
  // The bell going off (e.g. from another tab) closes the slider for
  // good — adjusting state during render, so it can't reopen on its own
  // when the bell comes back on.
  if (!enabled && volumeAnchor !== null) setVolumeAnchor(null);
  const isVolumeOpen = volumeAnchor !== null;

  return (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
      {isLocked && (
        <Typography variant="caption" color="text.secondary" role="status">
          Tap anywhere to enable sound
        </Typography>
      )}
      <IconButton
        aria-label="Sound alert for new orders"
        aria-pressed={enabled}
        onClick={onToggle}
        sx={{ width: 44, height: 44 }}
      >
        {enabled ? <NotificationsActiveIcon /> : <NotificationsOffIcon />}
      </IconButton>
      <IconButton
        aria-label="Alert volume"
        aria-haspopup="true"
        aria-expanded={isVolumeOpen}
        aria-controls={isVolumeOpen ? VOLUME_POPOVER_ID : undefined}
        disabled={!enabled}
        onClick={(event) => setVolumeAnchor(event.currentTarget)}
        sx={{ width: 44, height: 44 }}
      >
        <VolumeUpIcon />
      </IconButton>

      <Popover
        id={VOLUME_POPOVER_ID}
        open={isVolumeOpen}
        anchorEl={volumeAnchor}
        onClose={() => setVolumeAnchor(null)}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
        transformOrigin={{ vertical: "top", horizontal: "center" }}
      >
        {/* Side padding leaves room for the value label at 10% / 100%. */}
        <Box
          sx={{
            width: 240,
            maxWidth: "calc(100vw - 32px)",
            px: 3,
            pt: 1.5,
            pb: 1,
          }}
        >
          <Typography variant="caption" color="text.secondary" component="p">
            Alert volume
          </Typography>
          <Slider
            aria-label="Alert volume"
            min={MIN_VOLUME}
            max={MAX_VOLUME}
            step={10}
            value={volume}
            valueLabelDisplay="auto"
            valueLabelFormat={(value) => `${value}%`}
            onChange={(_event, value) => onVolumeChange(value as number)}
            // Once per release (or key press) — never on every drag step.
            onChangeCommitted={(_event, value) => {
              onVolumeChange(value as number);
              onTestBeep();
            }}
          />
        </Box>
      </Popover>
    </Stack>
  );
}
