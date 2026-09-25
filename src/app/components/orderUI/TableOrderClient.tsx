"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, useTheme } from "@mui/material";

import OrderTopBar from "./OrderTopBar";
import OrderBotBar from "./OrderBotBar";
import MenuBrowser, { MenuOption } from "./MenuBrowser";

import {
  addDraftItemAction,
  pollTableAction,
} from "@/app/(storefront)/counter/action";
import { DraftLine } from "@/app/(storefront)/cart/CartList";
import { useRefreshOnVisible } from "@/app/lib/hooks/useRefreshOnVisible";
import { usePolling } from "@/app/lib/hooks/usePolling";
import { dismissConfirmedRound } from "@/app/lib/hooks/useConfirmedRoundDismissed";
import { POLL_INTERVAL_MS } from "@/app/lib/hooks/usePollOrderStatus";
import {
  getOrderPageBackground,
  ORDER_PAGE_MIN_WIDTH,
} from "@/app/lib/theme/orderPageBackground";

interface TableOrderClientProps {
  tableId: number;
  locationId: number;
  shopName: string | null;
  myContributorToken: string;
  initialDraftItems: DraftLine[];
  /** The table's current round is waiting on counter approval — shows a
   *  spinner beside the top bar's cart icon. */
  initialAwaitingApproval: boolean;
  /** The table's current (not yet finished) round, if any — adding to the
   *  next order dismisses that round's "Order confirmed" screen. */
  activeRoundId: number | null;
  menus: MenuOption[];
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
  locationId,
  shopName,
  myContributorToken,
  initialDraftItems,
  initialAwaitingApproval,
  activeRoundId,
  menus,
}: TableOrderClientProps) {
  const router = useRouter();
  const pageBackground = getOrderPageBackground(useTheme());
  const [draftItems, setDraftItems] = useState(initialDraftItems);

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
    menu: { id: number; name: string; price: number },
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
      return result.error.message;
    }
    // Starting the next order: the previous round's "Order confirmed"
    // screen is done with, even if this item is removed again later.
    if (activeRoundId !== null) dismissConfirmedRound(tableId, activeRoundId);
    setDraftItems((current) => [
      ...current,
      {
        id: result.data.id,
        menuId: menu.id,
        menuName: menu.name,
        quantity,
        price: menu.price,
        contributorToken: myContributorToken,
        addonNames: [],
        addonIds,
        note: note || null,
      },
    ]);
    return null;
  }

  return (
    <Box
      sx={{
        minWidth: ORDER_PAGE_MIN_WIDTH,
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: pageBackground.color,
        backgroundImage: pageBackground.image,
        backgroundAttachment: "fixed",
      }}
    >
      <OrderTopBar
        shopName={shopName}
        cartItemCount={draftItems.length}
        awaitingApproval={isAwaitingApproval}
        onCartClick={() =>
          router.push(`/cart?locationId=${locationId}&tableId=${tableId}`)
        }
      />
      <Box
        sx={{
          flex: 1,
          width: "100%",
          p: { xs: 2, sm: 3 },
          maxWidth: 1200,
          mx: "auto",
        }}
      >
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 2 }}
        >
          Add items — everyone at your table shares the same order.
        </Typography>

        <MenuBrowser
          menus={menus}
          locationId={locationId}
          canOrder
          backgroundColor={pageBackground.color}
          backgroundImage={pageBackground.image}
          backgroundAttachment="fixed"
          onAddToCart={handleAddToCart}
        />
      </Box>
      <OrderBotBar locationId={locationId} tableId={tableId} />
    </Box>
  );
}
