"use client";

import { forwardRef } from "react";
import { Box, Stack, Typography } from "@mui/material";

export interface CartLine {
  id: number;
  menuId: number;
  menuName: string;
  quantity: number;
  price: number;
}

export interface Shortage {
  menuId: number;
  menuName: string;
  requested: number;
  available: number;
}

/** Table QR's draft line shape (see TableDraftService) — the same
 *  four fields as CartLine, plus who added it (contributorToken) and
 *  which addons they picked, since the draft review screen (see
 *  DraftList.tsx) needs both: contributorToken to decide whose card an
 *  item belongs to, addonNames because "no sugar" or "extra shot" is
 *  often the whole reason an item needs a second look before Send to
 *  Kitchen. */
export interface DraftLine extends CartLine {
  contributorToken: string;
  addonNames: string[];
  /** Needed (not just addonNames) so DraftList's Edit button can
   *  re-open MenuDetailDialog with the actual previous selection
   *  pre-checked — addonNames alone can't tell the dialog WHICH addon
   *  ids to pre-select, since names aren't guaranteed unique across
   *  categories the way ids are. */
  addonIds: number[];
}

interface CartListProps {
  cart: CartLine[];
  /** Menus that ran short since these lines were added — see the
   *  "decrement at submit, not at add" design discussion: a shortage
   *  can only be discovered this late, after the fact, so the cart
   *  has to be able to show it. Counter's cart has no per-item
   *  removal (that control was intentionally dropped — see this
   *  component's own history), so an affected line here is shown
   *  dimmed with a warning but isn't actionable from this screen;
   *  Send to Kitchen/Submit staying disabled is what actually blocks
   *  the customer from an order that would just fail anyway. */
  shortages?: Shortage[];
}

/**
 * Just renders what's already in the cart (line name/qty/price) — it
 * doesn't own the cart data itself and doesn't offer removing a line
 * (that control was intentionally dropped from the UI, per design
 * feedback). Forwarded ref so CounterOrderClient can position/scroll
 * to this block if needed later.
 */
const CartList = forwardRef<HTMLDivElement, CartListProps>(function CartList(
  { cart, shortages = [] },
  ref,
) {
  if (cart.length === 0) return null;

  const shortageByMenuId = new Map(
    shortages.map((shortage) => [shortage.menuId, shortage]),
  );

  return (
    <Box ref={ref} sx={{ mb: 3 }}>
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
        Your order
      </Typography>
      <Stack spacing={0.5}>
        {cart.map((line) => {
          const shortage = shortageByMenuId.get(line.menuId);
          return (
            <Box key={line.id} sx={{ opacity: shortage ? 0.5 : 1 }}>
              <Stack
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
              {shortage && (
                <Typography variant="caption" color="error">
                  {shortage.available > 0
                    ? `Only ${shortage.available} left — please contact staff to adjust.`
                    : "This just sold out — please contact staff to adjust."}
                </Typography>
              )}
            </Box>
          );
        })}
      </Stack>
    </Box>
  );
});

export default CartList;
