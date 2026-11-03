"use client";

import { useId } from "react";
import {
  Box,
  FormControlLabel,
  IconButton,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useTranslations } from "next-intl";
import {
  ALERT_REPEAT_CHOICES,
  MAX_VOLUME,
  MIN_VOLUME,
  type AlertRepeat,
} from "@/app/lib/hooks/orderAlertSoundRules";
import {
  ALERT_PRESETS,
  type AlertPresetId,
} from "@/app/lib/hooks/orderAlertPresets";

export interface AlertSettingsPanelProps {
  /** Integer percent, MIN_VOLUME–MAX_VOLUME. */
  volume: number;
  onVolumeChange: (percent: number) => void;
  /** One alert at the current volume, in the chosen sound. */
  onTestAlert: () => void;
  preset: AlertPresetId;
  /** Picks the sound — it plays once (a user gesture, so it also
   *  unlocks audio after a reload). */
  onPresetChange: (id: AlertPresetId) => void;
  /** Plays a sound once without picking it. */
  onPreview: (id: AlertPresetId) => void;
  repeat: AlertRepeat;
  onRepeatChange: (choice: AlertRepeat) => void;
  onClose: () => void;
  /** The heading's id — the popover / sheet is labelled by it. */
  titleId: string;
}

/** The section headings: caption, secondary — one size for all three. */
function SectionLabel({ id, children }: { id: string; children: string }) {
  return (
    <Typography
      id={id}
      variant="caption"
      color="text.secondary"
      component="h3"
      sx={{ fontWeight: 600, mb: 0.5 }}
    >
      {children}
    </Typography>
  );
}

/**
 * "Alert settings" for this device (DESIGN.md §25): Volume, Sound (the
 * five presets — lib/hooks/orderAlertPresets — each a radio row plus its
 * own ▶ preview button, never nested), Repeat (Once / 3 / 5 / 10 / 30s
 * as a segmented control; each segment's accessible name is the full
 * words, the caption under it spells out the choice). Shared by the
 * Order List's popover (from sm) and bottom sheet (phones) —
 * OrderSoundToggle. Scrolls inside itself when it's taller than the
 * screen; never wider than it.
 */
export default function AlertSettingsPanel({
  volume,
  onVolumeChange,
  onTestAlert,
  preset,
  onPresetChange,
  onPreview,
  repeat,
  onRepeatChange,
  onClose,
  titleId,
}: AlertSettingsPanelProps) {
  const t = useTranslations("bo.alerts");
  const soundLabelId = useId();
  const repeatLabelId = useId();
  const repeatWords = (choice: AlertRepeat) =>
    choice === "once" ? t("once") : t("everySeconds", { seconds: choice });

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        width: "100%",
      }}
    >
      <Stack
        direction="row"
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          pl: 2,
          pr: 0.5,
          pt: 0.5,
        }}
      >
        <Typography
          id={titleId}
          component="h2"
          variant="subtitle1"
          sx={{ fontWeight: 600, minWidth: 0 }}
        >
          {t("alertSettings")}
        </Typography>
        <IconButton
          aria-label={t("close")}
          onClick={onClose}
          sx={{ width: 44, height: 44, flexShrink: 0 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Stack>

      <Stack spacing={2} sx={{ px: 2, pb: 2, overflowY: "auto", minHeight: 0 }}>
        {/* Volume — as before. Side padding leaves room for the value
            label at 10% / 100%. */}
        <Box component="section" sx={{ px: 1 }}>
          <SectionLabel id={`${titleId}-volume`}>{t("volume")}</SectionLabel>
          <Slider
            aria-labelledby={`${titleId}-volume`}
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
              onTestAlert();
            }}
          />
        </Box>

        <Box component="section">
          <SectionLabel id={soundLabelId}>{t("sound")}</SectionLabel>
          <RadioGroup
            aria-labelledby={soundLabelId}
            value={preset}
            onChange={(_event, value) => onPresetChange(value as AlertPresetId)}
          >
            {ALERT_PRESETS.map(({ id }) => {
              const name = t(`presets.${id}`);
              return (
                <Stack
                  key={id}
                  direction="row"
                  sx={{ alignItems: "center", gap: 1, minHeight: 44 }}
                >
                  <FormControlLabel
                    value={id}
                    control={<Radio />}
                    label={name}
                    sx={{ flexGrow: 1, minWidth: 0, minHeight: 44, mr: 0 }}
                  />
                  <IconButton
                    aria-label={t("play", { name })}
                    onClick={() => onPreview(id)}
                    sx={{ width: 44, height: 44, flexShrink: 0 }}
                  >
                    <PlayArrowIcon />
                  </IconButton>
                </Stack>
              );
            })}
          </RadioGroup>
        </Box>

        <Box component="section">
          <SectionLabel id={repeatLabelId}>{t("repeat")}</SectionLabel>
          <ToggleButtonGroup
            exclusive
            fullWidth
            value={repeat}
            aria-labelledby={repeatLabelId}
            onChange={(_event, value: AlertRepeat | null) => {
              // Tapping the selected segment again keeps it (no "none").
              if (value !== null) onRepeatChange(value);
            }}
          >
            {ALERT_REPEAT_CHOICES.map((choice) => (
              <ToggleButton
                key={choice}
                value={choice}
                aria-label={repeatWords(choice)}
                sx={{ minHeight: 44, px: 1 }}
              >
                {choice === "once" ? t("once") : choice}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
          <Typography
            variant="caption"
            color="text.secondary"
            component="p"
            sx={{ mt: 0.5 }}
          >
            {repeatWords(repeat)}
          </Typography>
        </Box>
      </Stack>
    </Box>
  );
}
