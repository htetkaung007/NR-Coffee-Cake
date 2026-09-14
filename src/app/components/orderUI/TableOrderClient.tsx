"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Typography } from "@mui/material";

import OrderTopBar from "./OrderTopBar";
import MenuBrowser, { MenuOption } from "./MenuBrowser";
import ActiveRoundBanner, { ActiveRound } from "./ActiveRoundBanner";

import { addDraftItemAction } from "@/app/(storefront)/customer/action";
import { DraftLine } from "@/app/(storefront)/cart/Cartlist";
import { useRefreshOnVisible } from "./useRefreshOnVisible";
import {
  ORDER_PAGE_BACKGROUND_COLOR,
  ORDER_PAGE_BACKGROUND_IMAGE,
} from "./orderPageBackground";

interface TableOrderClientProps {
  tableId: number;
  locationId: number;
  shopName: string | null;
  myContributorToken: string;
  initialDraftItems: DraftLine[];
  initialActiveRound: ActiveRound | null;
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
 * draftItems/activeRound below are a snapshot as of this page load,
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
  initialActiveRound,
  menus,
}: TableOrderClientProps) {
  const router = useRouter();
  const [draftItems, setDraftItems] = useState(initialDraftItems);
  const [activeRound] = useState(initialActiveRound);

  useRefreshOnVisible(() => router.refresh());

  async function handleAddToCart(
    menu: { id: number; name: string; price: number },
    quantity: number,
    addonIds: number[],
  ): Promise<string | null> {
    const result = await addDraftItemAction(
      tableId,
      menu.id,
      quantity,
      addonIds,
    );
    if (!result.success) {
      return result.error.message;
    }
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
      },
    ]);
    return null;
  }

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: ORDER_PAGE_BACKGROUND_COLOR,
        backgroundImage: ORDER_PAGE_BACKGROUND_IMAGE,
        backgroundAttachment: "fixed",
      }}
    >
      <OrderTopBar
        shopName={shopName}
        cartItemCount={draftItems.length}
        onCartClick={() =>
          router.push(`/cart?locationId=${locationId}&tableId=${tableId}`)
        }
        onHistoryClick={() =>
          router.push(`/history?locationId=${locationId}&tableId=${tableId}`)
        }
      />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: "auto" }}>
        <ActiveRoundBanner activeRound={activeRound} />
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
          backgroundColor={ORDER_PAGE_BACKGROUND_COLOR}
          backgroundImage={ORDER_PAGE_BACKGROUND_IMAGE}
          backgroundAttachment="fixed"
          onAddToCart={handleAddToCart}
        />
      </Box>
    </Box>
  );
}
