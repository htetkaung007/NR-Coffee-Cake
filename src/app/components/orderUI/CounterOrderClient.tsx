"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Snackbar, Typography, useTheme } from "@mui/material";

import OrderTopBar from "./OrderTopBar";
import OrderBotBar from "./OrderBotBar";
import MenuBrowser, { MenuOption } from "./MenuBrowser";
import type { MenuDetail } from "./menuDetail/types";

import { toBrowserCartLine } from "@/app/lib/browserCart";
import { useBrowserCart } from "@/app/lib/hooks/useBrowserCart";
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
  menus: MenuOption[];
  /** The category tabs, in the server's order (see
   *  MenuService.getMenusForLocation) — passed through, never re-sorted. */
  categories: string[];
  shopName: string | null;
  /** Arrived from scanning the counter QR with an empty cart (see
   *  /counter/continue) — shows a one-time note. */
  justScanned?: boolean;
}

export default function CounterOrderClient({
  hasSession,
  locationId,
  orderNumber,
  menus,
  categories,
  shopName,
  initialStatus,
  justScanned = false,
}: CounterOrderClientProps) {
  const router = useRouter();
  const pageBackground = getOrderPageBackground(useTheme());

  // The cart lives in this browser (see useBrowserCart) — adding never
  // calls the server; the cart page checks and submits it.
  const browserCart = useBrowserCart(locationId);
  // Instant feedback for an add (DESIGN.md Rule 15): the dialog closes,
  // the badge counts up, and this names what was added.
  const [addedName, setAddedName] = useState<string | null>(null);
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

  // One-time, like the cart page's "Scanned" banner: drop the marker so
  // a reload doesn't show the note again.
  useEffect(() => {
    if (!justScanned) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("scanned");
    window.history.replaceState(null, "", url);
  }, [justScanned]);

  // Every Add goes through MenuDetailDialog, which has already checked
  // the required add-ons; the line keeps what the dialog showed (name,
  // prices, photo) for display only — the server re-prices everything
  // when the cart is checked and submitted.
  async function addToCart(
    _menu: { id: number; name: string; price: number },
    quantity: number,
    addonIds: number[],
    note: string,
    detail: MenuDetail,
  ): Promise<string | null> {
    browserCart.addLine(toBrowserCartLine(detail, quantity, addonIds, note));
    setAddedName(detail.name);
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
        cartItemCount={browserCart.itemCount}
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
            ? "Add items to your cart — scan the QR at the counter to send your order."
            : isAwaitingApproval
              ? "Your order is waiting for the counter to confirm. You can add more once it's accepted."
              : "Add items, then check your cart to submit for counter approval."}
        </Typography>

        {justScanned && (
          <Alert severity="success" role="status" sx={{ mb: 2 }}>
            Scanned ✓ — add items to order. Items added in another browser
            won&apos;t show here.
          </Alert>
        )}

        <MenuBrowser
          menus={menus}
          categories={categories}
          locationId={locationId}
          // The cart lives in this browser, so it can be built before any
          // scan (Online browsing); sending is what needs the counter QR.
          canOrder={locationId > 0 && !isAwaitingApproval}
          backgroundColor={pageBackground.color}
          backgroundImage={pageBackground.image}
          backgroundAttachment="fixed"
          onAddToCart={addToCart}
        />
      </Box>
      <OrderBotBar locationId={locationId} />
      <Snackbar
        open={addedName !== null}
        autoHideDuration={2000}
        onClose={() => setAddedName(null)}
        message={addedName ? `Added ${addedName} to your cart` : ""}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        // Below the sticky top bar, clear of the notch.
        sx={{ top: "calc(72px + env(safe-area-inset-top, 0px))" }}
        slotProps={{ content: { role: "status", "aria-live": "polite" } }}
      />
    </Box>
  );
}
