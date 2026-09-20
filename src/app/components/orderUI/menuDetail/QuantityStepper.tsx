"use client";

import { IconButton, Stack, Typography } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import RemoveIcon from "@mui/icons-material/Remove";

import { SHEET_TEXT } from "./sheetText";

/** Everything a quantity control needs — built once by the dialog and
 *  handed to whichever piece shows the stepper (the dialog body on
 *  tablet / desktop, the sticky footer on phones). */
export interface QuantityControl {
  value: number;
  /** Highest quantity allowed (the stock cap). */
  max: number;
  onDecrease: () => void;
  onIncrease: () => void;
}

interface QuantityStepperProps {
  quantity: QuantityControl;
  /** "pill": the bordered rounded control in the phone footer.
   *  "plain": the bare − n + row (centered dialog, cart lines). */
  variant: "pill" | "plain";
  /** Both buttons disabled — e.g. while a change is being saved. */
  disabled?: boolean;
}

export default function QuantityStepper({
  quantity,
  variant,
  disabled = false,
}: QuantityStepperProps) {
  const isPill = variant === "pill";

  return (
    <Stack
      direction="row"
      spacing={isPill ? 0 : 1.5}
      sx={{
        alignItems: "center",
        ...(isPill && {
          flexShrink: 0,
          p: 0.25,
          borderRadius: 999,
          border: "1px solid",
          borderColor: "divider",
          bgcolor: "background.default",
        }),
      }}
    >
      <IconButton
        size="small"
        aria-label="Decrease quantity"
        disabled={disabled || quantity.value <= 1}
        onClick={quantity.onDecrease}
      >
        <RemoveIcon fontSize="small" />
      </IconButton>
      <Typography
        sx={{
          minWidth: isPill ? 28 : 24,
          textAlign: "center",
          ...(isPill && { fontWeight: 700, fontSize: SHEET_TEXT.body }),
        }}
      >
        {quantity.value}
      </Typography>
      <IconButton
        size="small"
        aria-label="Increase quantity"
        disabled={disabled || quantity.value >= quantity.max}
        onClick={quantity.onIncrease}
      >
        <AddIcon fontSize="small" />
      </IconButton>
    </Stack>
  );
}
