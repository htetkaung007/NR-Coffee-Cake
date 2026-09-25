"use client";

import { IconButton, Stack, Typography } from "@mui/material";
import NotificationsActiveIcon from "@mui/icons-material/NotificationsActive";
import NotificationsOffIcon from "@mui/icons-material/NotificationsOff";

interface OrderSoundToggleProps {
  enabled: boolean;
  /** Sound is on but the browser hasn't allowed audio yet (a reloaded
   *  page needs one tap/keypress first). */
  isLocked: boolean;
  onToggle: () => void;
}

/** Bell that turns the new-order beep on/off. The icon itself changes
 *  (active vs crossed-out), so the state isn't carried by color. */
export default function OrderSoundToggle({
  enabled,
  isLocked,
  onToggle,
}: OrderSoundToggleProps) {
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
    </Stack>
  );
}
