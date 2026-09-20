"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, useTheme } from "@mui/material";

import OrderTopBar from "./OrderTopBar";
import OrderBotBar from "./OrderBotBar";
import MenuBrowser, { MenuOption } from "./MenuBrowser";

import { addToCartAction } from "@/app/(storefront)/counter/action";
import { CartLine } from "@/app/(storefront)/cart/Cartlist";
import { usePollOrderStatus } from "@/app/lib/hooks/usePollOrderStatus";
import {
  getOrderPageBackground,
  ORDER_PAGE_MIN_WIDTH,
} from "@/app/lib/theme/orderPageBackground";

interface CounterOrderClientProps {
  hasSession: boolean;
  locationId: number;
  orderNumber: string;
  initialStatus: string;
  initialCart: CartLine[];
  menus: MenuOption[];
  shopName: string | null;
}

export default function CounterOrderClient({
  hasSession,
  locationId,
  orderNumber,

  initialCart,
  menus,
  shopName,
  initialStatus,
}: CounterOrderClientProps) {
  const router = useRouter();
  const pageBackground = getOrderPageBackground(useTheme());

  const [cart, setCart] = useState(initialCart);
  // A submitted order still waiting on the counter: drives the spinner
  // beside the top bar's cart icon. Polled only while true (and only to
  // flip this flag — the menu grid itself isn't touched, see the
  // no-polling note on TableOrderClient), so it clears itself once the
  // order is approved, rejected or timed out.
  const [isAwaitingApproval, setIsAwaitingApproval] = useState(
    initialStatus === "PENDING_APPROVAL",
  );
  usePollOrderStatus(
    isAwaitingApproval,
    (result) => {
      if (result.status !== "PENDING_APPROVAL") setIsAwaitingApproval(false);
    },
    () => setIsAwaitingApproval(false),
  );

  // No polling here — Counter QR is now the only flow this component
  // handles (Table QR moved to TableOrderClient's per-customer draft
  // model), and a single Counter customer's own cart can't change
  // from anyone but this same phone, so there's nothing pre-submit to
  // poll for. Post-submit status polling lives on /cart instead (see
  // CartPageClient).

  // Every Add always goes through MenuDetailDialog now, even for a
  // menu with no addon categories at all — that keeps a single code
  // path for "attempt to add to cart" instead of a quick-add button
  // that would need its own copy of the required-addon error handling
  // MenuDetailDialog already has. The dialog itself just skips
  // rendering any category UI when addonCategories is empty. Errors
  // are shown inline inside the dialog (see its own error state) —
  // not surfaced again here.
  async function addToCart(
    menu: { id: number; name: string; price: number },
    quantity: number,
    addonIds: number[],
    note: string,
  ): Promise<string | null> {
    const result = await addToCartAction(menu.id, quantity, addonIds, note);
    if (!result.success) {
      return result.error.message;
    }
    setCart((current) => [
      ...current,
      {
        id: result.data.id,
        menuId: menu.id,
        menuName: menu.name,
        quantity,
        price: menu.price,
        note: note || null,
      },
    ]);
    return null;
  }

  // /menu always shows the browsing UI — status (submitted, waiting
  // for approval, confirmed) is shown exclusively on /cart's own
  // Submit button (see CartButton's status prop), never as a
  // full-page swap here. The cart itself (list + Submit) lives on its
  // own /cart route — see cart/page.tsx.
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
        cartItemCount={cart.length}
        awaitingApproval={isAwaitingApproval}
        onCartClick={() => {
          router.push(`/cart?locationId=${locationId}`);
          router.refresh();
        }}
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
        {hasSession && (
          <Typography variant="h6" sx={{ mb: 0.5 }}>
            {orderNumber}
          </Typography>
        )}
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ display: "block", mb: 2 }}
        >
          {hasSession
            ? "Add items, then check your cart to submit for counter approval."
            : "Browse the menu. Scan the table or counter QR to place an order."}
        </Typography>

        <MenuBrowser
          menus={menus}
          locationId={locationId}
          canOrder={hasSession}
          backgroundColor={pageBackground.color}
          backgroundImage={pageBackground.image}
          backgroundAttachment="fixed"
          onAddToCart={addToCart}
        />
      </Box>
      <OrderBotBar locationId={locationId} />
    </Box>
  );
}
