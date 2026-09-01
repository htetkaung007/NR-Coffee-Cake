"use client";

import { Button, CircularProgress, Stack, Typography } from "@mui/material";
import CheckCircleOutlinedIcon from "@mui/icons-material/CheckCircleOutlined";

export type CartButtonStatus =
  | "CART"
  | "PENDING_APPROVAL"
  | "PENDING"
  | "COOKING";

interface CartButtonProps {
  status: CartButtonStatus;
  itemCount: number;
  /** Sum of price × quantity across the cart. Only shown while still
   *  in CART status (once submitted, the order total won't change on
   *  this screen, so showing the item breakdown is enough). */
  total?: number;
  disabled: boolean;
  onClick: () => void;
}

/**
 * The cart's own action button — doubles as the order's status
 * indicator once submitted, per design feedback: rather than
 * navigating away to a separate "waiting for approval" screen, this
 * same button just changes its own label/icon (spinner while waiting,
 * a checkmark once confirmed) and stops being clickable.
 */
export default function CartButton({
  status,
  itemCount,
  total,
  disabled,
  onClick,
}: CartButtonProps) {
  if (status === "PENDING_APPROVAL") {
    return (
      <Button variant="contained" fullWidth disabled sx={{ opacity: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CircularProgress size={18} color="inherit" />
          <Typography component="span" sx={{ fontWeight: 700 }}>
            Waiting counter approval...
          </Typography>
        </Stack>
      </Button>
    );
  }

  if (status === "PENDING" || status === "COOKING") {
    return (
      <Button
        variant="contained"
        color="success"
        fullWidth
        disabled
        sx={{ opacity: 1 }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <CheckCircleOutlinedIcon fontSize="small" />
          <Typography component="span" sx={{ fontWeight: 700 }}>
            Order confirmed
          </Typography>
        </Stack>
      </Button>
    );
  }

  return (
    <Button variant="contained" fullWidth disabled={disabled} onClick={onClick}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography component="span" sx={{ fontWeight: 700 }}>
          Submit Order
        </Typography>
        {itemCount > 0 && (
          <Typography component="span" variant="body2">
            ({itemCount} {itemCount === 1 ? "item" : "items"}
            {total !== undefined ? ` · ${total.toLocaleString()} MMK` : ""})
          </Typography>
        )}
      </Stack>
    </Button>
  );
}
