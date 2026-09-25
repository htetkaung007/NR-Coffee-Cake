"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, useTheme } from "@mui/material";

import OrderTopBar from "./OrderTopBar";
import OrderBotBar from "./OrderBotBar";
import MenuBrowser, { MenuOption } from "./MenuBrowser";

import { addToCartAction } from "@/app/(storefront)/counter/action";
import { CartLine } from "@/app/(storefront)/cart/CartList";
import { countUnsubmittedItems } from "@/app/lib/orderTotals";
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
  // Whether the cart shown above belongs to a round that was already
  // submitted when the page loaded (anything but CART — including
  // PENDING_APPROVAL, which may get approved while the customer sits
  // on this page). Any successful add after that goes to a DIFFERENT
  // OrderSession than the one initialCart came from (see
  // OrderSessionService.getOrStartCartRound), so the submitted round's
  // items must be dropped, not merged with the new round's — otherwise
  // this page would keep showing (and the cart badge counting) a mix
  // of two different orders until the next full reload.
  const cartIsSubmittedRound = hasSession && initialStatus !== "CART";
  // Flips on the first successful add to that new CART round.
  const [cartRoundStarted, setCartRoundStarted] = useState(false);
  // A submitted order still waiting on the counter: drives the spinner
  // beside the top bar's cart icon, AND disables Add-to-cart below
  // (see canOrder) — a customer must not be able to route around a
  // pending Reject by starting a new round while this one is still
  // awaiting a decision (same rule OrderSessionService.
  // getOrStartCartRound enforces server-side; this is just the client
  // not letting them try). Polled only while true, so it clears itself
  // (and re-enables Add) the moment the order is approved, rejected or
  // timed out.
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
    const newItem = {
      id: result.data.id,
      menuId: menu.id,
      menuName: menu.name,
      quantity,
      price: menu.price,
      note: note || null,
    };
    if (cartIsSubmittedRound && !cartRoundStarted) {
      // First add while the page loaded showing a submitted round —
      // this just started (or reused) a brand-new CART round (see
      // OrderSessionService.getOrStartCartRound), so the submitted
      // round's own items no longer belong in this cart.
      setCart([newItem]);
      setCartRoundStarted(true);
    } else {
      setCart((current) => [...current, newItem]);
    }
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
        // `cart` keeps its lines after Submit, so count them only while
        // they're still un-submitted: the round the page loaded with
        // (initialStatus), or — once the first add after an Accept has
        // started a new round — that fresh CART round.
        cartItemCount={countUnsubmittedItems(
          cartRoundStarted ? "CART" : initialStatus,
          cart,
        )}
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
          {!hasSession
            ? "Browse the menu. Scan the table or counter QR to place an order."
            : isAwaitingApproval
              ? "Your order is waiting for the counter to confirm. You can add more once it's accepted."
              : "Add items, then check your cart to submit for counter approval."}
        </Typography>

        <MenuBrowser
          menus={menus}
          locationId={locationId}
          canOrder={hasSession && !isAwaitingApproval}
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
