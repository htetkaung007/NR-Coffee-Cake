"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "@mui/material";

import { useErrorMessage } from "@/app/lib/hooks/useErrorMessage";
import OrderTopBar from "./OrderTopBar";
import OrderPlaceHeader from "./OrderPlaceHeader";
import { useBottomBarPage } from "./OrderBotBar";
import MenuPageFrame from "./MenuPageFrame";
import MenuBrowser, { type CategoryTab, type MenuOption } from "./MenuBrowser";

import {
  addDraftItemAction,
  pollTableAction,
} from "@/app/(storefront)/table/action";
import { DraftLine } from "@/app/(storefront)/cart/CartList";
import { applyAddedLine, sumQuantities } from "@/app/lib/order/orderTotals";
import { toLineAddons } from "@/app/lib/order/lineAddons";
import { useRefreshOnVisible } from "@/app/lib/hooks/useRefreshOnVisible";
import { usePolling } from "@/app/lib/hooks/usePolling";
import { dismissConfirmedRound } from "@/app/lib/hooks/useRoundDismissed";
import { POLL_INTERVAL_MS } from "@/app/lib/hooks/usePollOrderStatus";
import { getOrderPageBackground } from "@/app/lib/theme/orderPageBackground";

interface TableOrderClientProps {
  tableId: number;
  /** The table's display name for the "where am I" line ("" when it
   *  couldn't be read — the line says "Your table"). */
  tableName: string;
  locationId: number;
  shopName: string | null;
  initialDraftItems: DraftLine[];
  /** The table's current round is waiting on counter approval — shows a
   *  spinner beside the top bar's cart icon. */
  initialAwaitingApproval: boolean;
  /** The table's current (not yet finished) round, if any — adding to the
   *  next order dismisses that round's "Order confirmed" screen. */
  activeRoundId: number | null;
  menus: MenuOption[];
  /** The category tabs, in the server's order (see
   *  MenuService.getMenusForLocation) — passed through, never re-sorted. */
  categories: CategoryTab[];
}

/**
 * Table QR's browsing screen — parallel to CounterOrderClient, but for
 * the per-customer draft design (see the design discussion): every
 * phone at the table sees the SAME draft list (not a private cart),
 * built up by everyone before anyone presses Send to Kitchen. Reuses
 * MenuBrowser as-is (its onAddToCart contract doesn't care whether the
 * pick lands in a session's cart or a table's draft pile).
 *
 * No continuous polling here — per design feedback, live sync while
 * just browsing menus felt unwanted (e.g. re-rendering under someone
 * mid-scroll), even though the draft itself is genuinely shared.
 * draftItems below are a snapshot as of this page load,
 * refreshed only when this tab becomes visible again (see
 * useRefreshOnVisible) — e.g. the customer switched to another app
 * and came back, which is also when a stale "this table's order was
 * closed" (see requireContributorToken's epoch check) is most likely
 * to have happened without this screen knowing yet. TableCartPageClient
 * (the review screen the cart icon leads to) is where staying in sync
 * across contributors on an ongoing basis actually matters, and that
 * screen still polls continuously. */
export default function TableOrderClient({
  tableId,
  tableName,
  locationId,
  shopName,
  initialDraftItems,
  initialAwaitingApproval,
  activeRoundId,
  menus,
  categories,
}: TableOrderClientProps) {
  const router = useRouter();
  const errorMessage = useErrorMessage();
  const pageBackground = getOrderPageBackground(useTheme());
  const [draftItems, setDraftItems] = useState(initialDraftItems);
  // The bottom bar's cart badge: the same count as the top bar's.
  useBottomBarPage({
    cartCount: sumQuantities(draftItems),
    locationId,
    tableId,
  });
  // How many other people have picks at this table (the server's labels
  // — a count only, never tokens), for the place header's details.
  const otherContributors = new Set(
    draftItems
      .filter((item) => !item.isMine && item.contributorNo !== null)
      .map((item) => item.contributorNo),
  ).size;

  useRefreshOnVisible(() => router.refresh());

  // Polled only while a round is waiting on approval, and only to flip
  // this flag (the draft list and menu grid aren't touched — see the
  // no-polling note above), so the spinner clears once the round is
  // approved, rejected or timed out.
  const [isAwaitingApproval, setIsAwaitingApproval] = useState(
    initialAwaitingApproval,
  );
  usePolling(
    isAwaitingApproval,
    POLL_INTERVAL_MS,
    () => pollTableAction(tableId, locationId),
    (result) => {
      if (
        !result.authorized ||
        result.activeRound?.status !== "PENDING_APPROVAL"
      ) {
        setIsAwaitingApproval(false);
      }
    },
  );

  async function handleAddToCart(
    menu: { id: number; name: string; nameMy?: string | null; price: number },
    quantity: number,
    addonIds: number[],
    note: string,
  ): Promise<string | null> {
    const result = await addDraftItemAction(
      tableId,
      menu.id,
      quantity,
      addonIds,
      note,
    );
    if (!result.success) {
      return errorMessage(result.error);
    }
    // Starting the next order: the previous round's "Order confirmed"
    // screen is done with, even if this item is removed again later.
    if (activeRoundId !== null) dismissConfirmedRound(tableId, activeRoundId);
    // An identical pick of this customer's own may have been merged
    // into (see TableDraftService.addDraftItem) — the returned row then
    // carries that line's new total quantity.
    setDraftItems((current) =>
      applyAddedLine(current, {
        id: result.data.id,
        menuId: menu.id,
        menuName: menu.name,
        menuNameMy: menu.nameMy ?? null,
        quantity: result.data.quantity,
        // The server's own snapshot, not this component's (possibly
        // stale) menu prop — see Order.unitPrice's own schema comment.
        price: result.data.unitPrice,
        // Labelled on the server ("You" + its number across the tab) —
        // this browser never sees a token.
        isMine: result.data.isMine,
        contributorNo: result.data.contributorNo,
        // With their own price snapshots — part of the line's total.
        addons: toLineAddons(result.data.OrdersAddons),
        note: result.data.note,
      }),
    );
    return null;
  }

  return (
    <MenuPageFrame
      background={pageBackground}
      topBar={
        <OrderTopBar
          shopName={shopName}
          cartItemCount={sumQuantities(draftItems)}
          awaitingApproval={isAwaitingApproval}
          onCartClick={() =>
            router.push(`/cart?locationId=${locationId}&tableId=${tableId}`)
          }
        />
      }
    >
      <OrderPlaceHeader
        place={{ kind: "table", tableName, othersCount: otherContributors }}
      />

      <MenuBrowser
        menus={menus}
        categories={categories}
        locationId={locationId}
        canOrder
        backgroundColor={pageBackground.color}
        backgroundImage={pageBackground.image}
        backgroundAttachment="fixed"
        onAddToCart={handleAddToCart}
      />
    </MenuPageFrame>
  );
}
