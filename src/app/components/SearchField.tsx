"use client";

import { IconButton, InputAdornment, TextField } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import ClearIcon from "@mui/icons-material/Clear";
import { useTranslations } from "next-intl";
import SearchIcon from "@mui/icons-material/Search";

/**
 * A Backoffice list's search box (DESIGN.md Rule 16): a labelled small
 * field with a search icon and, once there's text, a 44px clear (×)
 * button. The caller owns the value (and any debounce); `sx` is layout
 * only — the field's look is the theme's.
 */
export default function SearchField({
  label,
  value,
  onChange,
  sx,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  sx?: SxProps<Theme>;
}) {
  const t = useTranslations("bo.common");
  return (
    <TextField
      size="small"
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      sx={sx}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
          endAdornment: value && (
            <InputAdornment position="end">
              <IconButton
                aria-label={t("clearSearch")}
                size="small"
                onClick={() => onChange("")}
                sx={{ width: 44, height: 44 }}
              >
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
    />
  );
}
