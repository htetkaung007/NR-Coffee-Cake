"use client";

import { Box, Divider, TextField } from "@mui/material";

import {
  countWords,
  limitWords,
  MAX_ORDER_NOTE_WORDS,
} from "@/app/lib/order/orderNote";

import { SHEET_TEXT } from "./sheetText";
import type { MenuDetailVariant } from "./types";
import { useOrderUiLabels } from "../OrderUiLabels";

interface NoteFieldProps {
  value: string;
  onChange: (next: string) => void;
  variant: MenuDetailVariant;
  /** The hairline above it — off when nothing comes before it. */
  showDivider?: boolean;
}

/** "Special instructions" — a per-item note, capped at
 *  MAX_ORDER_NOTE_WORDS words (typing/pasting past it is trimmed back),
 *  with a live word counter. */
export default function NoteField({
  value,
  onChange,
  variant,
  showDivider = true,
}: NoteFieldProps) {
  const labels = useOrderUiLabels().menuDetail;
  return (
    <Box>
      {showDivider && <Divider sx={{ mb: 1.5 }} />}
      <TextField
        label={labels.noteLabel}
        multiline
        rows={2}
        fullWidth
        value={value}
        onChange={(event) => onChange(limitWords(event.target.value))}
        helperText={labels.noteWords(countWords(value), MAX_ORDER_NOTE_WORDS)}
        sx={
          variant === "sheet"
            ? {
                "& .MuiInputBase-root": { fontSize: SHEET_TEXT.body },
                "& .MuiInputLabel-root": { fontSize: SHEET_TEXT.body },
                "& .MuiFormHelperText-root": { fontSize: SHEET_TEXT.small },
              }
            : undefined
        }
      />
    </Box>
  );
}
