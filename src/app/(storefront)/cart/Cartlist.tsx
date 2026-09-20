"use client";

import { forwardRef } from "react";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import RestaurantOutlinedIcon from "@mui/icons-material/RestaurantOutlined";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";

import QuantityStepper from "@/app/components/orderUI/menuDetail/QuantityStepper";

export interface CartLine {
  id: number;
  menuId: number;
  menuName: string;
  quantity: number;
  price: number;
  /** The menu's photo (Menu.assetUrl); null/absent falls back to an icon. */
  imageUrl?: string | null;
  /** Populated when the caller fetched addon links alongside the order
   *  (both Counter's own cart and Table's draft do on initial load) —
   *  optional because a couple of read paths (e.g. CartButton's status-
   *  poll result) don't bother re-fetching addons for a cart the
   *  customer can no longer edit anyway. */
  addonNames?: string[];
  addonIds?: number[];
  /** Customer's per-item instruction ("no onion"); null/absent = none. */
  note?: string | null;
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
  /** Needed (not just addonNames) so tapping a line can re-open
   *  MenuDetailDialog with the actual previous selection pre-checked —
   *  addonNames alone can't tell the dialog WHICH addon ids to
   *  pre-select, since names aren't guaranteed unique across categories
   *  the way ids are. */
  addonIds: number[];
}

/** Highest quantity a line can be raised to — the same cap the server's
 *  schema enforces (see customerOrderSchema). */
const MAX_LINE_QUANTITY = 99;

const mutedTextSx = (theme: { palette: { decor: { mutedText: string } } }) => ({
  color: theme.palette.decor.mutedText,
});

interface CartLineRowProps {
  line: CartLine;
  shortage?: Shortage;
  addons?: string[];
  /** Whether the viewer can change this line: tap it to edit, the − / +
   *  stepper, and the ✕ to remove. A read-only row (someone else's item
   *  on a shared Table draft, or a cart that's already submitted) shows
   *  the quantity as plain text and has none of those. */
  actionable?: boolean;
  /** A change is being saved — controls are disabled meanwhile. */
  disabled?: boolean;
  onEdit?: () => void;
  onRemove?: () => void;
  onQuantityChange?: (next: number) => void;
}

/** One cart/draft line: photo, name, addons, note and quantity on the
 *  left; price and the ✕ (remove) on the right. Tapping the row opens it
 *  for editing. Shared by CartList (flat list) and DraftList (grouped into
 *  per-contributor cards) so its look can't drift between the two flows. */
export function CartLineRow({
  line,
  shortage,
  addons = [],
  actionable = false,
  disabled = false,
  onEdit,
  onRemove,
  onQuantityChange,
}: CartLineRowProps) {
  const canEdit = actionable && !!onEdit && !disabled;
  const canRemove = actionable && !!onRemove;
  const changeQuantity = actionable ? onQuantityChange : undefined;

  return (
    <Box
      onClick={canEdit ? onEdit : undefined}
      sx={{
        display: "flex",
        alignItems: "flex-start",
        gap: 1.5,
        py: 1.5,
        opacity: shortage ? 0.5 : 1,
        cursor: canEdit ? "pointer" : "default",
        ...(canEdit && { "&:hover": { bgcolor: "action.hover" } }),
      }}
    >
      <Avatar
        variant="rounded"
        src={line.imageUrl ?? undefined}
        alt={line.menuName}
        sx={{
          width: { xs: 64, sm: 72 },
          height: { xs: 64, sm: 72 },
          flexShrink: 0,
          borderRadius: 3,
          bgcolor: "background.paper",
          color: "text.secondary",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <RestaurantOutlinedIcon fontSize="small" />
      </Avatar>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* The keyboard-reachable "edit" target — pointer users can tap
           anywhere on the row (the wrapper's onClick). */}
        <Box
          role={canEdit ? "button" : undefined}
          tabIndex={canEdit ? 0 : undefined}
          aria-label={canEdit ? `Edit ${line.menuName}` : undefined}
          onKeyDown={
            canEdit
              ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onEdit?.();
                  }
                }
              : undefined
          }
          sx={{
            outline: "none",
            "&:focus-visible": {
              outline: "2px solid",
              outlineColor: "primary.main",
              outlineOffset: 2,
              borderRadius: 1,
            },
          }}
        >
          <Typography variant="body1" sx={{ fontWeight: 700, lineHeight: 1.35 }}>
            {line.menuName}
          </Typography>
          {addons.length > 0 && (
            <Typography variant="body2" sx={mutedTextSx}>
              + {addons.join(", ")}
            </Typography>
          )}
          {line.note && (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: "flex-start", mt: 0.25 }}
            >
              <StickyNote2OutlinedIcon
                sx={[{ fontSize: 14, mt: "3px" }, mutedTextSx]}
              />
              <Typography
                variant="body2"
                sx={[
                  { fontStyle: "italic", overflowWrap: "anywhere" },
                  mutedTextSx,
                ]}
              >
                {line.note}
              </Typography>
            </Stack>
          )}
        </Box>

        <Box sx={{ mt: 0.5 }} onClick={(event) => event.stopPropagation()}>
          {changeQuantity ? (
            <QuantityStepper
              variant="plain"
              disabled={disabled}
              quantity={{
                value: line.quantity,
                max: MAX_LINE_QUANTITY,
                onDecrease: () => changeQuantity(line.quantity - 1),
                onIncrease: () => changeQuantity(line.quantity + 1),
              }}
            />
          ) : (
            <Typography variant="body2" sx={mutedTextSx}>
              Qty {line.quantity}
            </Typography>
          )}
        </Box>

        {shortage && (
          <Typography variant="caption" color="error" sx={{ display: "block" }}>
            {shortage.available > 0
              ? `Only ${shortage.available} left`
              : "This just sold out"}
            {actionable ? " — change the quantity or remove it." : "."}
          </Typography>
        )}
      </Box>

      <Stack sx={{ alignItems: "flex-end", flexShrink: 0, gap: 1 }}>
        <Typography
          variant="body1"
          sx={{ fontWeight: 700, color: "error.main", whiteSpace: "nowrap" }}
        >
          {(line.price * line.quantity).toLocaleString()} MMK
        </Typography>
        {canRemove && (
          <IconButton
            aria-label={`Remove ${line.menuName}`}
            size="small"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onRemove?.();
            }}
            sx={{
              width: 32,
              height: 32,
              color: "text.secondary",
              bgcolor: "background.paper",
              border: "1px solid",
              borderColor: "divider",
              "&:hover": { color: "error.main", bgcolor: "action.hover" },
            }}
          >
            <CloseIcon sx={{ fontSize: 16 }} />
          </IconButton>
        )}
      </Stack>
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
   *  "CART") — tap-to-edit, the quantity stepper and ✕ are hidden once
   *  it isn't, since the backend would reject them anyway and a control
   *  that still tried the request would just surface a server error for
   *  something the UI could have prevented outright. */
  editable?: boolean;
  onRemove?: (orderId: number) => void;
  onEdit?: (line: CartLine) => void;
  onQuantityChange?: (line: CartLine, next: number) => void;
  isPending?: boolean;
  title?: string;
}

/**
 * Renders what's in the cart (photo, name, addons, note, quantity,
 * price), with tap-to-edit, a − / + quantity stepper and a ✕ remove per
 * item when `editable` — it doesn't own the cart data itself. Forwarded
 * ref so CounterOrderClient can position/scroll to this block if needed
 * later.
 */
const CartList = forwardRef<HTMLDivElement, CartListProps>(function CartList(
  {
    cart,
    shortages = [],
    editable = false,
    onRemove,
    onEdit,
    onQuantityChange,
    isPending = false,
    title = "Your order",
  },
  ref,
) {
  if (cart.length === 0) return null;

  const shortageByMenuId = new Map(
    shortages.map((shortage) => [shortage.menuId, shortage]),
  );

  return (
    <Box ref={ref} sx={{ mb: 3 }}>
      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 700 }}>
        {title}
      </Typography>
      <Stack divider={<Divider />}>
        {cart.map((line) => (
          <CartLineRow
            key={line.id}
            line={line}
            shortage={shortageByMenuId.get(line.menuId)}
            addons={line.addonNames}
            actionable={editable}
            disabled={isPending}
            onEdit={onEdit ? () => onEdit(line) : undefined}
            onRemove={onRemove ? () => onRemove(line.id) : undefined}
            onQuantityChange={
              onQuantityChange
                ? (next) => onQuantityChange(line, next)
                : undefined
            }
          />
        ))}
      </Stack>
    </Box>
  );
});

export default CartList;
