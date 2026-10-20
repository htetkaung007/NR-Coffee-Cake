"use client";

import { useCustomerPrice } from "@/app/lib/hooks/useCustomerPrice";
import { forwardRef, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { localizedText } from "@/app/lib/i18n/localizedText";
import {
  ButtonBase,
  Box,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import StickyNote2OutlinedIcon from "@mui/icons-material/StickyNote2Outlined";

import QuantityStepper from "@/app/components/orderUI/menuDetail/QuantityStepper";
import MenuThumb from "@/app/components/MenuThumb";
import RemovedByStaffNote from "@/app/components/orderUI/RemovedByStaffNote";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { cartLineTotal, type LineAddon } from "@/app/lib/order/orderTotals";
import type { ContributorLabel } from "@/app/lib/order/contributors";
import type { RemovedByStaff } from "@/app/lib/order/roundLine";
import {
  formatAddonSelections,
  localizeAddonSelections,
} from "@/app/lib/order/addonLabel";

export interface CartLine {
  id: number;
  menuId: number;
  menuName: string;
  /** The menu's Myanmar name (null/absent: menuName shows — the row
   *  picks with lib/i18n/localizedText). */
  menuNameMy?: string | null;
  quantity: number;
  price: number;
  /** The menu's photo (Menu.assetUrl); null/absent falls back to an icon. */
  imageUrl?: string | null;
  /** The line's picked add-ons with their own price snapshots
   *  (OrdersAddon.unitPrice) — always populated: the ids re-open
   *  MenuDetailDialog with the previous selection pre-checked (names
   *  aren't unique across categories the way ids are), the names show
   *  under the item, and the prices are part of what the line costs
   *  (see cartLineTotal — leaving them out under-charges the total). */
  addons: LineAddon[];
  /** Customer's per-item instruction ("no onion"); null/absent = none. */
  note?: string | null;
  /** Units staff took back off a sent line — how many and why, nothing
   *  more (roundLine.removedByStaff). `quantity` above is what's left;
   *  0 means all of it went. Null/absent on a cart or draft line. */
  removedByStaff?: RemovedByStaff | null;
}

export interface Shortage {
  menuId: number;
  menuName: string;
  requested: number;
  available: number;
}

/** A Table QR line (draft or submitted) with WHO ordered it — as a label
 *  (lib/order/contributors.ts), never the token, which stays on the server.
 *  DraftList and the round views group by it ("You", "Customer 2"). */
export type LabelledCartLine = CartLine & ContributorLabel;

/** Table QR's draft line shape (see TableDraftService). */
export type DraftLine = LabelledCartLine;

/** Highest quantity a line can be raised to — the same cap the server's
 *  schema enforces (see customerOrderSchema). */
const MAX_LINE_QUANTITY = 99;

const mutedTextSx = (theme: { palette: { decor: { mutedText: string } } }) => ({
  color: theme.palette.decor.mutedText,
});

interface CartLineRowProps {
  line: CartLine;
  shortage?: Shortage;
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
  /** Replaces the default price (this line's own snapshot total) — for a
   *  caller that shows the server's current numbers instead (the
   *  Counter's browser cart). */
  priceLabel?: ReactNode;
  /** Extra notice under the quantity (e.g. "Price updated"). */
  status?: ReactNode;
  /** Fades the photo and text (not the controls) — a line that can't be
   *  ordered as it is. */
  dimmed?: boolean;
}

/** One cart/draft line: photo, name, addons, note and quantity on the
 *  left; price and the ✕ (remove) on the right. Tapping the row opens it
 *  for editing. Shared by CartList (flat list) and DraftList (grouped into
 *  per-contributor cards) so its look can't drift between the two flows. */
export function CartLineRow({
  line,
  shortage,
  actionable = false,
  disabled = false,
  onEdit,
  onRemove,
  onQuantityChange,
  priceLabel,
  status,
  dimmed: dimmedByParent = false,
}: CartLineRowProps) {
  // Staff took every unit back: still shown, dimmed and struck through,
  // with the words saying why (DESIGN.md Rule 26).
  const t = useTranslations("common");
  const tNotice = useTranslations("lineNotice");
  const { price } = useCustomerPrice();
  const locale = useLocale();
  // Shop data in the customer's language (English when no Myanmar name).
  const menuName = localizedText(locale, line.menuName, line.menuNameMy);
  const removed = line.removedByStaff ?? null;
  const isFullyRemoved = removed !== null && line.quantity === 0;
  const dimmed = dimmedByParent || isFullyRemoved;
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
        ...(canEdit && {
          [hoverCapableMedia]: { "&:hover": { bgcolor: "action.hover" } },
        }),
      }}
    >
      {/* The shared menu image (MenuThumb): the photo, or the same
          first-letter tile every menu image falls back to. The name is
          right beside it, so the image itself is decorative here. */}
      <Box
        sx={{
          width: { xs: 64, sm: 72 },
          height: { xs: 64, sm: 72 },
          flexShrink: 0,
          borderRadius: 3,
          overflow: "hidden",
          bgcolor: "background.paper",
          border: "1px solid",
          borderColor: "divider",
          opacity: dimmed ? 0.5 : 1,
        }}
      >
        <MenuThumb name={menuName} imageUrl={line.imageUrl} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0 }}>
        {/* The keyboard-reachable "edit" target (ButtonBase: Enter and
           Space work, focus ring when tabbed to) — pointer users can tap
           anywhere on the row (the wrapper's onClick). It handles its own
           click and stops it, so an edit never fires twice. The quantity
           stepper stays outside it (no nested interactive elements). A
           read-only row is plain text. */}
        <EditTarget
          canEdit={canEdit}
          label={t("editItem", { name: menuName })}
          onEdit={onEdit}
          dimmed={dimmed}
        >
          <Typography
            variant="body1"
            sx={{
              fontWeight: 700,
              lineHeight: 1.35,
              textDecoration: isFullyRemoved ? "line-through" : "none",
            }}
          >
            {menuName}
          </Typography>
          {line.addons.length > 0 && (
            <Typography variant="body2" sx={mutedTextSx}>
              +{" "}
              {formatAddonSelections(localizeAddonSelections(locale, line.addons))}
            </Typography>
          )}
          {line.note && (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: "flex-start", mt: 0.25 }}
            >
              <StickyNote2OutlinedIcon
                sx={[{ fontSize: 16, mt: "4px" }, mutedTextSx]}
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
        </EditTarget>

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
              {t("qty", {
                quantity: isFullyRemoved ? removed.quantity : line.quantity,
              })}
            </Typography>
          )}
        </Box>

        {removed && (
          <RemovedByStaffNote
            removed={removed}
            isFullyRemoved={isFullyRemoved}
            sx={mutedTextSx}
          />
        )}

        {shortage && (
          <Typography variant="caption" color="error" sx={{ display: "block" }}>
            {shortage.available > 0
              ? tNotice("shortageLeft", { count: shortage.available })
              : tNotice("shortageSoldOut")}
            {actionable ? tNotice("shortageAction") : tNotice("shortageEnd")}
          </Typography>
        )}
        {status}
      </Box>

      <Stack sx={{ alignItems: "flex-end", flexShrink: 0, gap: 1 }}>
        {priceLabel ??
          (isFullyRemoved ? null : (
            <Typography
              variant="body1"
              sx={{
                fontWeight: 700,
                color: "text.primary",
                whiteSpace: "nowrap",
              }}
            >
              {price(cartLineTotal(line))}
            </Typography>
          ))}
        {canRemove && (
          <IconButton
            aria-label={t("removeItem", { name: menuName })}
            size="small"
            disabled={disabled}
            onClick={(event) => {
              event.stopPropagation();
              onRemove?.();
            }}
            // 44×44 tap area (DESIGN.md Rule 10); the visible 32px circle
            // is the inner span, and the negative margin keeps it where it
            // was.
            sx={{
              width: 44,
              height: 44,
              p: 0,
              m: -0.75,
              [hoverCapableMedia]: {
                "&:hover": {
                  bgcolor: "transparent",
                  "& > .remove-circle": {
                    color: "error.main",
                    bgcolor: "action.hover",
                  },
                },
              },
            }}
          >
            <Box
              component="span"
              className="remove-circle"
              sx={{
                width: 32,
                height: 32,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "50%",
                color: "text.secondary",
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </Box>
          </IconButton>
        )}
      </Stack>
    </Box>
  );
}

/** CartLineRow's edit target: a ButtonBase when the line can be edited
 *  (keyboard + focus ring; no ripple, so pointer users see nothing new),
 *  plain text otherwise. */
function EditTarget({
  canEdit,
  label,
  onEdit,
  dimmed,
  children,
}: {
  canEdit: boolean;
  label: string;
  onEdit?: () => void;
  dimmed: boolean;
  children: ReactNode;
}) {
  if (!canEdit) {
    return <Box sx={{ opacity: dimmed ? 0.5 : 1 }}>{children}</Box>;
  }
  return (
    <ButtonBase
      component="div"
      disableRipple
      aria-label={label}
      onClick={(event) => {
        event.stopPropagation();
        onEdit?.();
      }}
      sx={{
        display: "block",
        width: "100%",
        textAlign: "left",
        opacity: dimmed ? 0.5 : 1,
        "&.Mui-focusVisible": {
          outline: "2px solid",
          outlineColor: "primary.main",
          outlineOffset: 2,
          borderRadius: 1,
        },
      }}
    >
      {children}
    </ButtonBase>
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
    title,
  },
  ref,
) {
  const tCart = useTranslations("cart");
  if (cart.length === 0) return null;

  const shortageByMenuId = new Map(
    shortages.map((shortage) => [shortage.menuId, shortage]),
  );

  return (
    <Box ref={ref} sx={{ mb: 3 }}>
      <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 700 }}>
        {title ?? tCart("yourOrder")}
      </Typography>
      <Stack divider={<Divider />}>
        {cart.map((line) => (
          <CartLineRow
            key={line.id}
            line={line}
            shortage={shortageByMenuId.get(line.menuId)}
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
