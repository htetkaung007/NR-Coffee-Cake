"use client";

import { useEffect, useState } from "react";
import { useMediaQuery, useTheme } from "@mui/material";
import { getMenuDetailAction } from "@/app/(storefront)/counter/action";

import MenuDetailBody from "./menuDetail/MenuDetailBody";
import MenuDetailCenteredDialog from "./menuDetail/MenuDetailCenteredDialog";
import MenuDetailFooter from "./menuDetail/MenuDetailFooter";
import MenuDetailSheet from "./menuDetail/MenuDetailSheet";
import type { MenuDetail, MenuDetailVariant } from "./menuDetail/types";

/** Pre-fills the dialog for editing an already-added line — see
 *  DraftList's Edit button. Presence of this prop (vs undefined) is
 *  what switches the dialog between "Add to Cart" and "Save Changes"
 *  mode, not a separate boolean, so there's only one source of truth
 *  for which mode it's in. */
export interface MenuDetailEditingSelection {
  quantity: number;
  addonIds: number[];
  /** The line's existing note, so editing pre-fills it (empty/absent
   *  = no note). */
  note?: string;
}

interface MenuDetailDialogProps {
  open: boolean;
  menuId: number | null;
  locationId: number;
  canOrder: boolean;
  onClose: () => void;
  onSubmit: (
    menuId: number,
    quantity: number,
    addonIds: number[],
    /** Trimmed; "" when the customer left it blank. */
    note: string,
  ) => Promise<string | null>;
  editing?: MenuDetailEditingSelection;
  /** Show the "Special instructions" field. On by default; a caller
   *  whose onSubmit can't store a note (e.g. the staff order flow, whose
   *  actions don't take one yet) turns it off so the field isn't
   *  offered only to have what's typed silently dropped. */
  allowNote?: boolean;
}

/**
 * Fetches its own detail data (getMenuDetailAction) rather than taking
 * it as a prop — the parent's menu list only carries name/price/
 * description (see CounterOrderClient's MenuOption), not the nested
 * addon data, so this dialog is the one place that data is needed and
 * the one place it's fetched. Kept as a separate component (not
 * inlined into CounterOrderClient) for the same reason MenuStockService
 * got its own file: this is a clearly separate concern (addon
 * selection) from cart/order-status management.
 *
 * This file owns the state and the fetch/submit logic; what's on screen
 * lives in ./menuDetail (body, footer, addon rows, quantity stepper,
 * note field, and the two shells below).
 *
 * Two presentations, chosen by screen width:
 * - Phone (< 600px): a bottom sheet (SwipeableDrawer) — slides up from
 *   the bottom; closes with the ✕, by dragging it down, or by tapping the
 *   dimmed area outside it. The quantity stepper sits in the sticky
 *   footer next to the Add-to-cart button, and the addon radios /
 *   checkboxes are at the right edge.
 * - Tablet / desktop: the centered dialog, as it was.
 * Either way, required addon groups are listed first.
 */
export default function MenuDetailDialog({
  open,
  menuId,
  locationId,
  canOrder,
  onClose,
  onSubmit,
  editing,
  allowNote = true,
}: MenuDetailDialogProps) {
  const [fetchedForMenuId, setFetchedForMenuId] = useState<number | null>(null);
  const [detail, setDetail] = useState<MenuDetail | null>(null);
  const [selected, setSelected] = useState<Record<number, number[]>>({});
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Derived, not a separate state field set inside the effect below —
  // "loading" just means "open, with a menuId the last fetch hasn't
  // caught up to yet". Avoids calling setState synchronously at the
  // top of the effect body (react-hooks/set-state-in-effect), which
  // would otherwise trigger an extra render before the real one.
  const loading = open && menuId !== null && fetchedForMenuId !== menuId;
  const theme = useTheme();
  // Phones get the bottom sheet; anything wider keeps the centered dialog.
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"), { noSsr: true });

  useEffect(() => {
    if (!open || menuId === null) return;

    getMenuDetailAction(menuId, locationId).then((result) => {
      setDetail(result);
      setFetchedForMenuId(menuId);
      if (editing) {
        // Pre-fill from the existing line's own selection — addonIds
        // is flat (not grouped by category), so it's re-grouped here
        // the same way the server re-derives grouping from
        // MenuAddonCategories (see validateAddonSelection's comment).
        const grouped: Record<number, number[]> = {};
        for (const category of result?.addonCategories ?? []) {
          const picked = category.addons
            .map((addon) => addon.id)
            .filter((id) => editing.addonIds.includes(id));
          if (picked.length > 0) grouped[category.id] = picked;
        }
        setSelected(grouped);
        setQuantity(editing.quantity);
        setNote(editing.note ?? "");
      } else {
        setSelected({});
        setQuantity(1);
        setNote("");
      }
    });
    // editing is a fresh object every render from most callers — only
    // its identity-independent contents matter for re-initializing,
    // so it's read inside the effect but deliberately left out of the
    // dependency array (open/menuId already re-run this per dialog
    // open, which is the only time re-initializing should happen).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, menuId, locationId]);

  function selectRequired(categoryId: number, addonId: number) {
    setSelected((current) => ({ ...current, [categoryId]: [addonId] }));
  }

  function toggleOptional(categoryId: number, addonId: number) {
    setSelected((current) => {
      const existing = current[categoryId] ?? [];
      const next = existing.includes(addonId)
        ? existing.filter((id) => id !== addonId)
        : [...existing, addonId];
      return { ...current, [categoryId]: next };
    });
  }

  // Every required category must have a selection before Add to Cart
  // is enabled — this is UX-only, the real enforcement is server-side
  // (see OrderSessionService.validateAddonSelection), same reasoning
  // as the hasSession button-hiding in CounterOrderClient.
  const missingRequired =
    detail?.addonCategories
      .filter((category) => category.isRequired)
      .some((category) => (selected[category.id] ?? []).length === 0) ?? false;

  // Editing an existing line still shows the stock cap so the
  // customer knows how far they can raise the quantity, but a
  // shortage that appeared since they first added it shouldn't lock
  // them out of REDUCING or removing it — only raising further.
  const maxQuantity = Math.max(detail?.quantity ?? 0, editing?.quantity ?? 0);
  const isSoldOut = maxQuantity <= 0 || detail?.isAvailable === false;

  // Live preview of what "Add to Cart" is about to submit — base price
  // plus whichever addons are currently selected, times quantity. Not
  // the source of truth for billing (that's computed server-side from
  // scratch, see OrderSessionApprovalService), just UI feedback.
  const allAddons = detail?.addonCategories.flatMap((c) => c.addons) ?? [];
  const selectedAddonsTotal = Object.values(selected)
    .flat()
    .reduce((sum, addonId) => {
      const addon = allAddons.find((a) => a.id === addonId);
      return sum + (addon?.price ?? 0);
    }, 0);
  const totalPrice = ((detail?.price ?? 0) + selectedAddonsTotal) * quantity;

  async function handleSubmit() {
    if (!detail) return;
    setSubmitting(true);
    setError(null);
    const addonIds = Object.values(selected).flat();
    const errorMessage = await onSubmit(
      detail.id,
      quantity,
      addonIds,
      note.trim(),
    );
    setSubmitting(false);
    if (errorMessage) {
      setError(errorMessage);
      return;
    }
    onClose();
  }

  // Required groups first — the customer has to answer them before Add to
  // Cart enables, so they shouldn't be buried under optional extras. The
  // sort is stable, so each group keeps its own order.
  const categories = [...(detail?.addonCategories ?? [])].sort(
    (a, b) => Number(b.isRequired) - Number(a.isRequired),
  );

  const quantityControl = {
    value: quantity,
    max: maxQuantity,
    onDecrease: () => setQuantity((q) => Math.max(1, q - 1)),
    onIncrease: () => setQuantity((q) => Math.min(maxQuantity, q + 1)),
  };

  const variant: MenuDetailVariant = isMobile ? "sheet" : "dialog";
  const Shell = isMobile ? MenuDetailSheet : MenuDetailCenteredDialog;

  return (
    <Shell
      open={open}
      onClose={onClose}
      footer={
        !loading && detail && canOrder ? (
          <MenuDetailFooter
            variant={variant}
            name={detail.name}
            totalPrice={totalPrice}
            quantity={quantityControl}
            isSoldOut={isSoldOut}
            submitDisabled={missingRequired || submitting || isSoldOut}
            submitLabel={editing ? "Save Changes" : "Add to Cart"}
            onSubmit={handleSubmit}
          />
        ) : null
      }
    >
      <MenuDetailBody
        variant={variant}
        loading={loading}
        detail={detail}
        categories={categories}
        selected={selected}
        onSelectRequired={selectRequired}
        onToggleOptional={toggleOptional}
        quantity={quantityControl}
        isSoldOut={isSoldOut}
        showNote={allowNote && canOrder && !isSoldOut}
        note={note}
        onNoteChange={setNote}
        error={error}
      />
    </Shell>
  );
}
