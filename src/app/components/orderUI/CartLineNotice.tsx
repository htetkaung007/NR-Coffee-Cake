"use client";

import type { ReactNode } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

import type { ValidatedCartLine } from "@/app/lib/cart/cartValidation";
import { useOrderUiLabels } from "./OrderUiLabels";

interface CartLineNoticeProps {
  line: ValidatedCartLine;
  /** For insufficientStock: the largest quantity THIS line can have with
   *  the menu's other lines left as they are (0 = none left for it). */
  fitQuantity: number;
  onChangeQuantity: (quantity: number) => void;
  onRemove: () => void;
  onEdit: () => void;
}

/** A line's check result from the server, in words and an icon (never
 *  colour alone — DESIGN.md Rule 13), with the one action that fixes it.
 *  Nothing for an "ok" line. */
export default function CartLineNotice({
  line,
  fitQuantity,
  onChangeQuantity,
  onRemove,
  onEdit,
}: CartLineNoticeProps) {
  const { lineNotice: labels, price } = useOrderUiLabels();
  switch (line.status) {
    case "ok":
      return null;

    case "priceChanged":
      return (
        <Notice icon={<SellOutlinedIcon color="warning" />}>
          {labels.priceUpdated}{" "}
          <Box component="span" sx={{ textDecoration: "line-through" }}>
            {price(line.previousUnitPrice ?? 0)}
          </Box>{" "}
          → {labels.priceEach(price(line.unitPrice ?? 0))}
        </Notice>
      );

    case "insufficientStock":
      return (
        <Notice
          icon={<WarningAmberRoundedIcon color="warning" />}
          action={
            fitQuantity > 0 ? (
              <ActionButton onClick={() => onChangeQuantity(fitQuantity)}>
                {labels.changeTo(fitQuantity)}
              </ActionButton>
            ) : (
              <ActionButton onClick={onRemove}>{labels.remove}</ActionButton>
            )
          }
        >
          {labels.onlyLeft(line.availableQuantity ?? 0)}
        </Notice>
      );

    case "soldOut":
      return (
        <Notice
          icon={<BlockOutlinedIcon color="error" />}
          action={<ActionButton onClick={onRemove}>{labels.remove}</ActionButton>}
        >
          {labels.soldOut}
        </Notice>
      );

    case "unavailable":
      return (
        <Notice
          icon={<BlockOutlinedIcon color="error" />}
          action={<ActionButton onClick={onRemove}>{labels.remove}</ActionButton>}
        >
          {labels.unavailable}
        </Notice>
      );

    case "addonUnavailable":
      return (
        <Notice
          icon={<ErrorOutlineRoundedIcon color="warning" />}
          action={<ActionButton onClick={onEdit}>{labels.edit}</ActionButton>}
        >
          {labels.addonUnavailable}
        </Notice>
      );

    case "invalid":
      return (
        <Notice icon={<ErrorOutlineRoundedIcon color="warning" />}>
          {labels.invalid}
        </Notice>
      );
  }
}

function Notice({
  icon,
  action,
  children,
}: {
  icon: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Stack
      direction="row"
      spacing={1}
      useFlexGap
      sx={{ alignItems: "center", flexWrap: "wrap", mt: 0.5 }}
      // The row itself is tappable to edit — a notice's own button
      // mustn't also trigger that.
      onClick={(event) => event.stopPropagation()}
    >
      <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        <Box aria-hidden sx={{ display: "flex", "& svg": { fontSize: 18 } }}>
          {icon}
        </Box>
        <Typography variant="body2">{children}</Typography>
      </Stack>
      {action}
    </Stack>
  );
}

function ActionButton({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button
      variant="outlined"
      size="small"
      onClick={onClick}
      sx={{ minHeight: 44, minWidth: 44 }}
    >
      {children}
    </Button>
  );
}
