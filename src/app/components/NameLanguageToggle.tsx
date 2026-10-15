"use client";

import {
  ToggleButton,
  ToggleButtonGroup,
  type SxProps,
  type Theme,
} from "@mui/material";
import type { AppLocale } from "@/app/lib/i18n/locale";

/**
 * EN | မြန်မာ — which language a Backoffice screen shows what customers
 * could read (shop data names, and on New Order the menu side's words).
 * Display only: it never changes stored data. The Backoffice UI itself
 * stays English. Used by the Add-ons panel, the add-on form's "Customer
 * sees" preview and staff New Order. Small, 44px touch height.
 */
export default function NameLanguageToggle({
  value,
  onChange,
  ariaLabel,
  sx,
}: {
  value: AppLocale;
  onChange: (next: AppLocale) => void;
  ariaLabel: string;
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
