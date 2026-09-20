"use client";

import { Box, Button, DialogActions, Stack, Typography } from "@mui/material";

import QuantityStepper, { type QuantityControl } from "./QuantityStepper";
import { SHEET_TEXT } from "./sheetText";
import type { MenuDetailVariant } from "./types";

interface MenuDetailFooterProps {
  variant: MenuDetailVariant;
  /** The item's name — shown beside the total in the dialog footer. */
  name: string;
  totalPrice: number;
  quantity: QuantityControl;
  isSoldOut: boolean;
  /** Add-to-cart / Save button disabled (required addon missing,
   *  submitting, or sold out). */
  submitDisabled: boolean;
  submitLabel: string;
  onSubmit: () => void;
}

/** The sticky action area.
 *  - sheet (phone): stepper + one wide "Add to Cart · total" button on a
 *    single row ("Only N left" above it).
 *  - dialog (tablet / desktop): name + total on a row, then a full-width
 *    button — as it always was. */
export default function MenuDetailFooter({
  variant,
  name,
  totalPrice,
  quantity,
  isSoldOut,
  submitDisabled,
  submitLabel,
  onSubmit,
}: MenuDetailFooterProps) {
  if (variant === "sheet") {
    return (
      <Box
        sx={{
          flexShrink: 0,
          bgcolor: "background.paper",
          borderTop: "1px solid",
          borderColor: "divider",
          px: 2.5,
          pt: 1.5,
          pb: "calc(12px + env(safe-area-inset-bottom, 0px))",
        }}
      >
        {!isSoldOut && quantity.max <= 5 && (
          <Typography
            variant="caption"
            color="warning.main"
            sx={{ display: "block", mb: 0.75 }}
          >
            Only {quantity.max} left
          </Typography>
        )}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          {!isSoldOut && <QuantityStepper quantity={quantity} variant="pill" />}
          <Button
            variant="contained"
            fullWidth
            disabled={submitDisabled}
            onClick={onSubmit}
            sx={{
              borderRadius: 999,
              py: 1.25,
              whiteSpace: "nowrap",
              fontSize: SHEET_TEXT.body,
            }}
          >
            {submitLabel}
            {!isSoldOut && ` · ${totalPrice.toLocaleString()} MMK`}
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <DialogActions
      sx={{
        flexDirection: "column",
        alignItems: "stretch",
        flexShrink: 0,
        px: 3,
        py: 2,
        gap: 1,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {!isSoldOut && (
        <Stack
          direction="row"
          sx={{ justifyContent: "space-between", alignItems: "center" }}
        >
          <Typography sx={{ fontWeight: 700 }}>{name}</Typography>
          <Typography sx={{ fontWeight: 700, color: "primary.main" }}>
            {totalPrice.toLocaleString()} MMK
          </Typography>
        </Stack>
      )}
      <Button
        variant="contained"
        fullWidth
        disabled={submitDisabled}
        onClick={onSubmit}
      >
        {submitLabel}
      </Button>
    </DialogActions>
  );
}
