"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useMediaQuery, useTheme } from "@mui/material";
import { getMenuDetailAction } from "@/app/(storefront)/menu/action";
import { lineTotal } from "@/app/lib/order/orderTotals";

import MenuDetailAside from "./menuDetail/MenuDetailAside";
import MenuDetailBody from "./menuDetail/MenuDetailBody";
import MissingChoiceNotice from "./menuDetail/MissingChoiceNotice";
import MenuDetailCenteredDialog from "./menuDetail/MenuDetailCenteredDialog";
import MenuDetailFooter from "./menuDetail/MenuDetailFooter";
import MenuDetailSheet from "./menuDetail/MenuDetailSheet";
import type { MenuDetail, MenuDetailVariant } from "./menuDetail/types";
import { useOrderUiLabels } from "./OrderUiLabels";
import { localizedText } from "@/app/lib/i18n/localizedText";
import {
  choiceSummary,
  missingRequiredGroups,
} from "@/app/lib/menu/menuDetailChoice";
import { reducedMotionQuery } from "@/app/lib/theme/sharedThemeTokens";

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
    /** The item as this dialog showed it (current name, prices, add-ons,
     *  photo) — for a caller that keeps its own copy of the line, like
     *  the Counter's browser cart. Callers that save on the server ignore
     *  it. */
    detail: MenuDetail,
  ) => Promise<string | null>;
  editing?: MenuDetailEditingSelection;
  /** How the detail is read. Default: the customer read
   *  (getMenuDetailAction — which follows the menu-access rule). The
   *  staff New Order page passes its own, guarded by the staff session.
   *  Pass a stable function (an imported Server Action), not an inline
   *  one — it's an effect dependency. */
  loadDetail?: (
    menuId: number,
    locationId: number,
  ) => ReturnType<typeof getMenuDetailAction>;
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
  loadDetail = getMenuDetailAction,
}: MenuDetailDialogProps) {
  const { locale: uiLocale, menuDetail: labels } = useOrderUiLabels();
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

  // Fills the form once a menu's detail arrives: from the line being
  // edited, or empty. An Effect Event, so it reads the current `editing`
  // (a fresh object every render from most callers) without making it a
  // dependency — the effect below re-runs per dialog open (open /
  // menuId), the only time re-initializing should happen.
  const applyLoadedDetail = useEffectEvent((result: MenuDetail | null) => {
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

  useEffect(() => {
    if (!open || menuId === null) return;

    loadDetail(menuId, locationId).then((result) => {
      setDetail(result);
      setFetchedForMenuId(menuId);
      applyLoadedDetail(result);
    });
  }, [open, menuId, locationId, loadDetail]);

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


  // Editing an existing line still shows the stock cap so the
  // customer knows how far they can raise the quantity, but a
  // shortage that appeared since they first added it shouldn't lock
  // them out of REDUCING or removing it — only raising further.
  const maxQuantity = Math.max(detail?.quantity ?? 0, editing?.quantity ?? 0);
  const isSoldOut = maxQuantity <= 0 || detail?.isAvailable === false;

  // Live preview of what "Add to Cart" is about to submit — today's
  // Menu/Addon prices (nothing is snapshotted until the line is saved),
  // priced by the same lineTotal formula the cart and bill use, so the
  // preview and the eventual line agree (add-ons counted per unit).
  const allAddons = detail?.addonCategories.flatMap((c) => c.addons) ?? [];
  const selectedAddonPrices = Object.values(selected)
    .flat()
    .map((addonId) => allAddons.find((a) => a.id === addonId)?.price ?? 0);
  const totalPrice = lineTotal(
    detail?.price ?? 0,
    selectedAddonPrices,
    quantity,
  );

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
      detail,
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

  // Every required category must have a selection before Add to Cart
  // is enabled — this is UX-only, the real enforcement is server-side
  // (see OrderSessionService.validateAddonSelection), same reasoning
  // as the hasSession button-hiding in CounterOrderClient. The missing
  // ones are named above the button, in display order.
  const missingGroups = missingRequiredGroups(categories, selected);
  const missingRequired = missingGroups.length > 0;

  // Each group's section, so "Please choose: …" can show the first one.
  const groupElements = useRef(new Map<number, HTMLDivElement>());
  function registerGroup(groupId: number, element: HTMLDivElement | null) {
    if (element) groupElements.current.set(groupId, element);
    else groupElements.current.delete(groupId);
  }
  function showFirstMissing() {
    const first = missingGroups[0];
    const element = first && groupElements.current.get(first.id);
    if (!element) return;
    const reduceMotion = window.matchMedia(reducedMotionQuery).matches;
    element.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
    element.focus({ preventScroll: true });
  }

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
      aside={
        !isMobile && !loading && detail ? (
          <MenuDetailAside
            detail={detail}
            choices={choiceSummary(uiLocale, categories, selected)}
          />
        ) : null
      }
      footer={
        !loading && detail && canOrder ? (
          <MenuDetailFooter
            variant={variant}
            notice={
              isSoldOut ? null : (
                <MissingChoiceNotice
                  hasRequiredGroups={categories.some(
                    (category) => category.isRequired,
                  )}
                  missingNames={missingGroups.map((group) =>
                    localizedText(uiLocale, group.name, group.nameMy),
                  )}
                  onShowFirst={showFirstMissing}
                />
              )
            }
            totalPrice={totalPrice}
            quantity={quantityControl}
            isSoldOut={isSoldOut}
            submitDisabled={missingRequired || submitting || isSoldOut}
            submitLabel={editing ? labels.saveChanges : labels.addToCart}
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
        isSoldOut={isSoldOut}
        registerGroup={registerGroup}
        showNote={canOrder && !isSoldOut}
        note={note}
        onNoteChange={setNote}
        error={error}
      />
    </Shell>
  );
}
