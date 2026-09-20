"use client";

import { Box, Divider, TextField } from "@mui/material";

import {
  countWords,
  limitWords,
  MAX_ORDER_NOTE_WORDS,
} from "@/app/lib/orderNote";

import { SHEET_TEXT } from "./sheetText";
import type { MenuDetailVariant } from "./types";

interface NoteFieldProps {
  value: string;
  onChange: (next: string) => void;
  variant: MenuDetailVariant;
}

/** "Special instructions" — a per-item note, capped at
 *  MAX_ORDER_NOTE_WORDS words (typing/pasting past it is trimmed back),
 *  with a live word counter. */
export default function NoteField({
  value,
  onChange,
  variant,
}: NoteFieldProps) {
  return (
    <Box>
      <Divider sx={{ mb: 1.5 }} />
      <TextField
        label="Special instructions (optional)"
        multiline
        rows={2}
        fullWidth
        value={value}
        onChange={(event) => onChange(limitWords(event.target.value))}
        helperText={`${countWords(value)}/${MAX_ORDER_NOTE_WORDS} words`}
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
