"use client";

import {
  ToggleButton,
  ToggleButtonGroup,
  type SxProps,
  type Theme,
} from "@mui/material";
import type { AppLocale } from "@/app/lib/i18n/locale";

/**
 * EN | မြန်မာ — the one language switch look on staff screens. As a
 * preview switch it picks which language a Backoffice screen shows what
 * customers could read (shop data names, and on New Order the menu
 * side's words) — display only, it never changes stored data: the
 * Add-ons panel, the add-on form's "Customer sees" preview, staff New
 * Order and the print preview. The account menu's Language row uses it
 * for the staff's own language (BO_LOCALE). Small, 44px touch height.
 */
export default function NameLanguageToggle({
  value,
  onChange,
  ariaLabel,
  disabled,
  sx,
}: {
  value: AppLocale;
  onChange: (next: AppLocale) => void;
  ariaLabel: string;
  /** While a choice is being saved. */
  disabled?: boolean;
  /** Layout only (margins, flex). */
  sx?: SxProps<Theme>;
}) {
  return (
    <ToggleButtonGroup
      exclusive
      size="small"
      value={value}
      onChange={(_, next: AppLocale | null) => {
        if (next) onChange(next);
      }}
      aria-label={ariaLabel}
      disabled={disabled}
      sx={[{ flexShrink: 0 }, ...(Array.isArray(sx) ? sx : [sx])]}
    >
      <ToggleButton value="en" sx={{ minWidth: 44, minHeight: 44 }}>
        EN
      </ToggleButton>
      <ToggleButton value="my" lang="my" sx={{ minWidth: 44, minHeight: 44 }}>
        မြန်မာ
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
