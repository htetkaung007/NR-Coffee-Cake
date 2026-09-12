"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Box, Typography } from "@mui/material";

import OrderTopBar from "./OrderTopBar";
import MenuBrowser, { MenuOption } from "./MenuBrowser";

import { addToCartAction } from "@/app/customer/action";
import { CartLine } from "@/app/cart/Cartlist";

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
}: CounterOrderClientProps) {
  const router = useRouter();

  const [cart, setCart] = useState(initialCart);

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
  ): Promise<string | null> {
    const result = await addToCartAction(menu.id, quantity, addonIds);
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
        minHeight: "100vh",
        p: 3,
        border: "2px solid #59402F",
        borderRadius: "9px",
        boxShadow: "8px 8px 0 #59402F",
        background: `
      radial-gradient(
        circle,
        rgba(79, 53, 37, 0.12) 1px,
        transparent 1.25px
      ),
      linear-gradient(
        135deg,
        rgba(197, 151, 104, 0.08),
        transparent 45%
      ),
      #EFE5D3
    `,
        backgroundSize: "9px 9px, auto, auto",
      }}
    >
      <OrderTopBar
        shopName={shopName}
        cartItemCount={cart.length}
        onCartClick={() => {
          router.push(`/cart?locationId=${locationId}`);
          router.refresh();
        }}
      />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: "auto" }}>
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
          onAddToCart={addToCart}
        />
      </Box>
    </Box>
  );
}
