"use client";

import { forwardRef } from "react";
import { Box, Stack, Typography } from "@mui/material";

export interface CartLine {
  id: number;
  menuName: string;
  quantity: number;
  price: number;
}

interface CartListProps {
  cart: CartLine[];
}

/**
 * Just renders what's already in the cart (line name/qty/price) — it
 * doesn't own the cart data itself and doesn't offer removing a line
 * (that control was intentionally dropped from the UI, per design
 * feedback). Forwarded ref so CounterOrderClient can position/scroll
 * to this block if needed later.
 */
const CartList = forwardRef<HTMLDivElement, CartListProps>(function CartList(
  { cart },
  ref,
) {
  if (cart.length === 0) return null;

  return (
    <Box ref={ref} sx={{ mb: 3 }}>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
        Your order
      </Typography>
      <Stack spacing={0.5}>
        {cart.map((line) => (
          <Stack
            key={line.id}
            direction="row"
            sx={{ justifyContent: "space-between", alignItems: "center" }}
          >
            <Typography variant="body2">
              {line.quantity} × {line.menuName}
            </Typography>
            <Typography variant="body2">
              {(line.price * line.quantity).toLocaleString()} MMK
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Box>
  );
});

export default CartList;
