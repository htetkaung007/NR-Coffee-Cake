"use client";

import type { ReactNode } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";
import SellOutlinedIcon from "@mui/icons-material/SellOutlined";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";
import ErrorOutlineRoundedIcon from "@mui/icons-material/ErrorOutlineRounded";

import type { ValidatedCartLine } from "@/app/lib/cart/cartValidation";
import { formatAmount } from "@/app/lib/orderFormat";

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
  switch (line.status) {
    case "ok":
      return null;

    case "priceChanged":
      return (
        <Notice icon={<SellOutlinedIcon color="warning" />}>
          Price updated:{" "}
          <Box component="span" sx={{ textDecoration: "line-through" }}>
            {formatAmount(line.previousUnitPrice ?? 0)}
          </Box>{" "}
          → {formatAmount(line.unitPrice ?? 0)} each
        </Notice>
      );

    case "insufficientStock":
      return (
        <Notice
          icon={<WarningAmberRoundedIcon color="warning" />}
          action={
            fitQuantity > 0 ? (
              <ActionButton onClick={() => onChangeQuantity(fitQuantity)}>
                Change to ×{fitQuantity}
              </ActionButton>
            ) : (
              <ActionButton onClick={onRemove}>Remove</ActionButton>
            )
          }
        >
          Only {line.availableQuantity} left
        </Notice>
      );

    case "soldOut":
      return (
        <Notice
          icon={<BlockOutlinedIcon color="error" />}
          action={<ActionButton onClick={onRemove}>Remove</ActionButton>}
        >
          Sold out — not included in the total
        </Notice>
      );

    case "unavailable":
      return (
        <Notice
          icon={<BlockOutlinedIcon color="error" />}
          action={<ActionButton onClick={onRemove}>Remove</ActionButton>}
        >
          No longer available — not included in the total
        </Notice>
      );

    case "addonUnavailable":
      return (
        <Notice
          icon={<ErrorOutlineRoundedIcon color="warning" />}
          action={<ActionButton onClick={onEdit}>Edit</ActionButton>}
        >
          An option you picked is no longer available
        </Notice>
      );

    case "invalid":
      return (
        <Notice icon={<ErrorOutlineRoundedIcon color="warning" />}>
          Choose a quantity from 1 to 99
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
