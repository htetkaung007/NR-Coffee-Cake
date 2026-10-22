"use client";

import { Box, Stack, Typography } from "@mui/material";

import SubmitButton, { type SubmitStatus } from "@/app/components/SubmitButton";
import QuantityStepper, { type QuantityControl } from "./QuantityStepper";
import type { MenuDetailVariant } from "./types";
import { useOrderUiLabels } from "../OrderUiLabels";

interface MenuDetailFooterProps {
  variant: MenuDetailVariant;
  totalPrice: number;
  quantity: QuantityControl;
  isSoldOut: boolean;
  /** Add-to-cart / Save button disabled (required addon missing, or
   *  sold out). While it sends, `submitStatus` disables it too. */
  submitDisabled: boolean;
  submitLabel: string;
  /** busy → the spinner + "Adding…" / "Saving…" (submitBusyLabel). */
  submitStatus: SubmitStatus;
  submitBusyLabel: string;
  onSubmit: () => void;
  /** Above the button: why it's off (MissingChoiceNotice), if anything. */
  notice?: React.ReactNode;
}

/** The pinned action area — the button keeps its label always (never
 *  "Choose …"); why it's off is the notice line above it.
 *  - sheet (phone): stepper + one wide "Add to Cart · total" button on a
 *    single row ("Only N left" above it) — as before.
 *  - dialog (tablet / desktop, the right column's foot): stepper on the
 *    left; the line total (the menu card's price tone) beside the
 *    button on the right. Wraps under a narrow column. */
export default function MenuDetailFooter({
  variant,
  totalPrice,
  quantity,
  isSoldOut,
  submitDisabled,
  submitLabel,
  submitStatus,
  submitBusyLabel,
  onSubmit,
  notice,
}: MenuDetailFooterProps) {
  const { menuDetail: labels, price } = useOrderUiLabels();
  const onlyLeft = !isSoldOut && quantity.max <= 5 && (
    <Typography
      variant="caption"
      color="warning.main"
      sx={{ display: "block", mb: 0.75 }}
    >
      {labels.onlyLeft(quantity.max)}
    </Typography>
  );

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
        {notice}
        {onlyLeft}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
          {!isSoldOut && <QuantityStepper quantity={quantity} variant="pill" />}
          <SubmitButton
            variant="contained"
            fullWidth
            status={submitStatus}
            busyLabel={submitBusyLabel}
            disabled={submitDisabled}
            onClick={onSubmit}
            sx={{
              borderRadius: 999,
              py: 1.25,
              whiteSpace: "nowrap",
            }}
          >
            {submitLabel}
            {!isSoldOut && ` · ${price(totalPrice)}`}
          </SubmitButton>
        </Stack>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        flexShrink: 0,
        px: 3,
        py: 2,
        borderTop: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      {notice}
      {onlyLeft}
      <Stack
        direction="row"
        useFlexGap
        sx={{ alignItems: "center", flexWrap: "wrap", gap: 1.5 }}
      >
        {!isSoldOut && <QuantityStepper quantity={quantity} variant="plain" />}
        <Stack
          direction="row"
          useFlexGap
          sx={{
            alignItems: "center",
            justifyContent: "flex-end",
            flexWrap: "wrap",
            gap: 1.5,
            flex: "1 1 auto",
            minWidth: 0,
          }}
        >
          {!isSoldOut && (
            <Typography
              variant="subtitle1"
              component="p"
              sx={{
                fontWeight: 700,
                whiteSpace: "nowrap",
                // The menu card's price tone (decor.price).
                color: "decor.price",
              }}
            >
              {price(totalPrice)}
            </Typography>
          )}
          <SubmitButton
            variant="contained"
            status={submitStatus}
            busyLabel={submitBusyLabel}
            disabled={submitDisabled}
            onClick={onSubmit}
            // A long label (Myanmar) wraps inside a narrow column rather
            // than pushing past it.
            sx={{ minHeight: 44, px: 3, maxWidth: "100%" }}
          >
            {submitLabel}
          </SubmitButton>
        </Stack>
      </Stack>
    </Box>
  );
}
