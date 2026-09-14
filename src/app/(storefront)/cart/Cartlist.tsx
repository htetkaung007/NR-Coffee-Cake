"use client";

import { forwardRef } from "react";
import { Box, Button, Stack, Typography } from "@mui/material";

export interface CartLine {
  id: number;
  menuId: number;
  menuName: string;
  quantity: number;
  price: number;
  /** Populated when the caller fetched addon links alongside the order
   *  (both Counter's own cart and Table's draft do on initial load) —
   *  optional because a couple of read paths (e.g. CartButton's status-
   *  poll result) don't bother re-fetching addons for a cart the
   *  customer can no longer edit anyway. */
  addonNames?: string[];
  addonIds?: number[];
}

export interface Shortage {
  menuId: number;
  menuName: string;
  requested: number;
  available: number;
}

/** Table QR's draft line shape (see TableDraftService) — the same
 *  fields as CartLine, but addonNames/addonIds are always populated
 *  (narrowed from optional to required) since the draft review screen
 *  (see DraftList.tsx) always needs both: contributorToken to decide
 *  whose card an item belongs to, addonNames because "no sugar" or
 *  "extra shot" is often the whole reason an item needs a second look
 *  before Send to Kitchen. */
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

interface CartLineActionsProps {
  disabled: boolean;
  onEdit: () => void;
  onRemove: () => void;
}

/** Edit/Cancel button pair shared by CartList (Counter, current
 *  customer's whole cart) and DraftList (Table, only the current
 *  contributor's own items) — same actions, same backend contract
 *  (both ultimately reject anything that's no longer still-editable
 *  server-side), so the buttons themselves don't need to know which
 *  flow they're in. */
export function CartLineActions({
  disabled,
  onEdit,
  onRemove,
}: CartLineActionsProps) {
  return (
    <Stack
      direction="row"
      spacing={0.5}
      sx={{ justifyContent: "flex-end", mt: 0.5 }}
    >
      <Button size="small" disabled={disabled} onClick={onEdit}>
        Edit
      </Button>
      <Button size="small" color="error" disabled={disabled} onClick={onRemove}>
        Cancel
      </Button>
    </Stack>
  );
}

interface CartLineRowProps {
  line: CartLine;
  shortage?: Shortage;
  addons?: string[];
  /** Controls the shortage copy: an actionable row (the viewer can
   *  Edit/Cancel it themselves) is told so; a read-only row (someone
   *  else's item on a shared Table draft) shouldn't imply a fix the
   *  viewer can't perform. */
  actionable?: boolean;
  actions?: React.ReactNode;
}

/** One cart/draft line's display — quantity chip, name (truncated),
 *  price, optional addon summary, optional actions slot, optional
 *  shortage warning. Shared by CartList (flat list) and DraftList
 *  (grouped into per-contributor cards) so this row's look can't drift
 *  between the two flows. */
export function CartLineRow({
  line,
  shortage,
  addons = [],
  actionable = false,
  actions,
}: CartLineRowProps) {
  return (
    <Box sx={{ opacity: shortage ? 0.5 : 1 }}>
      <Stack
        direction="row"
        sx={{ justifyContent: "space-between", alignItems: "flex-start" }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: "center", minWidth: 0 }}
          >
            <Box
              component="span"
              sx={{
                flexShrink: 0,
                minWidth: 26,
                textAlign: "center",
                px: 0.5,
                py: 0.1,
                borderRadius: 1,
                bgcolor: "action.selected",
                fontSize: "0.8rem",
                fontWeight: 700,
              }}
            >
              {line.quantity}×
            </Box>
            <Typography
              variant="body2"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {line.menuName}
            </Typography>
          </Stack>
          {addons.length > 0 && (
            <Typography variant="caption" color="text.secondary">
              + {addons.join(", ")}
            </Typography>
          )}
        </Box>
        <Typography variant="body2" sx={{ flexShrink: 0, pl: 1 }}>
          {(line.price * line.quantity).toLocaleString()} MMK
        </Typography>
      </Stack>
      {actions}
      {shortage && (
        <Typography variant="caption" color="error">
          {shortage.available > 0
            ? `Only ${shortage.available} left`
            : "This just sold out"}
          {actionable ? " — please edit or cancel." : "."}
        </Typography>
      )}
    </Box>
  );
}

interface CartListProps {
  cart: CartLine[];
  /** Menus that ran short since these lines were added — see the
   *  "decrement at submit, not at add" design discussion: a shortage
   *  can only be discovered this late, after the fact, so the cart
   *  has to be able to show it. */
  shortages?: Shortage[];
  /** True while the cart is still self-service editable (status ===
   *  "CART") — Edit/Cancel are hidden once it isn't, since the backend
   *  would reject them anyway and a disabled-looking action that still
   *  tried the request would just surface a server error for something
   *  the UI could have prevented outright. */
  editable?: boolean;
  onRemove?: (orderId: number) => void;
  onEdit?: (line: CartLine) => void;
  isPending?: boolean;
}

/**
 * Renders what's in the cart (line name/qty/price/addons), with
 * optional per-item Edit/Cancel when `editable` — it doesn't own the
 * cart data itself. Forwarded ref so CounterOrderClient can position/
 * scroll to this block if needed later.
 */
const CartList = forwardRef<HTMLDivElement, CartListProps>(function CartList(
  { cart, shortages = [], editable = false, onRemove, onEdit, isPending = false },
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
      <Stack spacing={1}>
        {cart.map((line) => (
          <CartLineRow
            key={line.id}
            line={line}
            shortage={shortageByMenuId.get(line.menuId)}
            addons={line.addonNames}
            actionable={editable}
            actions={
              editable && onEdit && onRemove ? (
                <CartLineActions
                  disabled={isPending}
                  onEdit={() => onEdit(line)}
                  onRemove={() => onRemove(line.id)}
                />
              ) : undefined
            }
          />
        ))}
      </Stack>
    </Box>
  );
});

export default CartList;
