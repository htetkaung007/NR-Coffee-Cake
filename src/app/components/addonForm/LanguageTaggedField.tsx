"use client";

import type { ChangeEvent } from "react";
import {
  Box,
  InputAdornment,
  TextField,
  Typography,
  type SxProps,
  type Theme,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import { useTranslations } from "next-intl";
import { langAttr } from "@/app/lib/i18n/locale";
import CharacterCount from "../CharacterCount";

/** The start tag's words: which language (or what) the field holds. */
type FieldTag = "en" | "my" | "price";

/** "EN" / "မြန်မာ" are each language's own name (never translated);
 *  "Price" is the staff's word (bo.addonForm.tagPrice). */
const LANGUAGE_TAG_TEXT = {
  en: "EN",
  my: "မြန်မာ",
} as const;

interface LanguageTaggedFieldProps {
  /** The real accessible name ("Group name in English") — the visual
   *  tag is not the label. */
  ariaLabel: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  /** The start tag. Omitted — no tag (a column header says it). */
  tag?: FieldTag;
  /** Shown from `md` down only (the row grid's column headers take over
   *  from there). */
  tagBelowMdOnly?: boolean;
  /** Quiet words at the end ("Required", "Optional", "MMK"). */
  endText?: string;
  /** The value is Myanmar text (lang="my" on the input). */
  myanmar?: boolean;
  placeholder?: string;
  /** The schema's limit: the input's maxLength, and the "12/50
   *  characters" counter under it (the same on both language twins). */
  maxLength?: number;
  required?: boolean;
  /** A price: numeric keypad, right-aligned digits. */
  numeric?: boolean;
  /** Small by default (47px tall — still over the 44px touch target). */
  size?: "small" | "medium";
  /** Layout only (width, margins, grid area) — never the field's look
   *  (CLAUDE.md Rule 10). */
  sx?: SxProps<Theme>;
}

/**
 * One add-on group form field with a language "tag" in its start
 * adornment ("EN" / "မြန်မာ" / "Price") — a tinted block the full height
 * of the input, divided from the text by a 1px line. The field's own
 * fill, border, radius and padding stay the theme's: only the adornment
 * is styled here.
 */
export default function LanguageTaggedField({
  ariaLabel,
  value,
  onChange,
  tag,
  tagBelowMdOnly = false,
  endText,
  myanmar = false,
  placeholder,
  maxLength,
  required,
  numeric = false,
  size = "small",
  sx,
}: LanguageTaggedFieldProps) {
  const t = useTranslations("bo.addonForm");
  const startAdornment = tag ? (
    <InputAdornment
      position="start"
      // The adornment fills the input's height and starts at its left
      // edge (it cancels the root's adorned-start padding, then keeps the
      // same gap before the text).
      sx={{
        display: tagBelowMdOnly ? { xs: "flex", md: "none" } : "flex",
        alignSelf: "stretch",
        height: "auto",
        maxHeight: "none",
        ml: -1.5,
        mr: 1,
      }}
    >
      <Box
        aria-hidden
        sx={(theme) => ({
          height: "100%",
          display: "flex",
          alignItems: "center",
          px: 1,
          bgcolor: alpha(theme.palette.primary.main, 0.06),
          borderRight: "1px solid",
          borderColor: "divider",
          borderTopLeftRadius: theme.shape.borderRadius,
          borderBottomLeftRadius: theme.shape.borderRadius,
        })}
      >
        <Typography
          variant="caption"
          component="span"
          lang={langAttr(tag)}
          sx={{
            fontWeight: 600,
            color: "text.secondary",
            whiteSpace: "nowrap",
          }}
        >
          {tag === "price" ? t("tagPrice") : LANGUAGE_TAG_TEXT[tag]}
        </Typography>
      </Box>
    </InputAdornment>
  ) : undefined;

  const endAdornment = endText ? (
    <InputAdornment position="end">
      <Typography variant="caption" component="span" color="text.secondary">
        {endText}
      </Typography>
    </InputAdornment>
  ) : undefined;

  return (
    <TextField
      fullWidth
      size={size}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      helperText={
        maxLength !== undefined && !numeric ? (
          <CharacterCount count={value.length} max={maxLength} />
        ) : undefined
      }
      sx={sx}
      slotProps={{
        input: { startAdornment, endAdornment },
        htmlInput: {
          "aria-label": ariaLabel,
          maxLength,
          lang: myanmar ? "my" : undefined,
          ...(numeric && {
            inputMode: "numeric",
            pattern: "[0-9]*",
            style: { textAlign: "right" },
          }),
        },
      }}
    />
  );
}
