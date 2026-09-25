"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import { usePollOrderStatus } from "@/app/lib/hooks/usePollOrderStatus";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

import {
  removeFromCartAction,
  submitOrderAction,
  updateCartItemAction,
} from "@/app/(storefront)/counter/action";
import CartList, { CartLine, Shortage } from "@/app/(storefront)/cart/CartList";
import CartButton, { CartButtonStatus } from "./CartButton";
import MenuDetailDialog from "./MenuDetailDialog";
import BackCircleButton from "./BackCircleButton";
import OrderConfirmedScreen from "./OrderConfirmedScreen";
import EmptyCartState from "./EmptyCartState";

interface CartPageClientProps {
  /** The round's id — for the receipt link on the order-confirmed screen. */
  sessionId: number;
  /** The round's billing total at page load, for the order-confirmed
   *  screen (kept current by the status poll). */
  initialTotal: number;
  locationId: number;
  orderNumber: string;
  shopName: string | null;
  initialStatus: CartButtonStatus;
  initialCart: CartLine[];
  /** True when this bill already has an earlier round with the
   *  kitchen (see OrderSessionService.getOrStartCartRound) — only
   *  possible while initialStatus is CART, since that's the only
   *  status this page shows the editable cart for. Drives a one-line
   *  notice near the top so the customer knows these items are a NEW
   *  order, not additions to what's already cooking. */
  hasEarlierRound?: boolean;
  /** Snapshot taken at page load — there's no polling pre-submit here
   *  (a lone Counter customer's own cart can't change from anyone but
   *  them — see CounterOrderClient.tsx), so this can go stale between
   *  load and submit; the real enforcement is still the atomic
   *  decrementStock inside submitOrderForApproval, same as it always
   *  was. Shown dimmed with a warning, and Edit/Cancel let the
   *  customer self-serve a fix (same as Table's draft review) rather
   *  than being forced to just wait or ask staff. */
  initialShortages: Shortage[];
}

/**
 * The cart's own page (see cart/page.tsx for why it's a separate
 * route). Per design feedback, submitting here does NOT navigate away
 * to a separate "waiting for approval" screen — the customer stays on
 * this page and the Submit button itself becomes the status indicator
 * (spinner while waiting, a checkmark once confirmed; see
 * CartButton's status prop). Only a terminal outcome (approved-then-
 * paid, rejected, or timed out) leaves this page, since there's
 * nothing left here to show once the session itself is gone.
 */
export default function CartPageClient({
  sessionId,
  initialTotal,
  locationId,
  orderNumber,
  shopName,
  initialStatus,
  initialCart,
  hasEarlierRound = false,
  initialShortages,
}: CartPageClientProps) {
  const router = useRouter();
  const [cart, setCart] = useState(initialCart);
  const [status, setStatus] = useState<CartButtonStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<CartLine | null>(null);
  const [roundTotal, setRoundTotal] = useState(initialTotal);
  const hasShortage = initialShortages.length > 0;

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart],
  );

  // Only starts once submitted — while still in CART on this page,
  // there's nothing server-side that could change without this
  // customer's own action (unlike /menu's browsing view, which polls
  // even pre-submit for shared Table sessions — see
  // CounterOrderClient.tsx's isTableSession).
  usePollOrderStatus(
    status === "PENDING_APPROVAL",
    (result) => {
      setStatus(result.status as CartButtonStatus);
      setCart(result.cart);
      setRoundTotal(result.total);
    },
    () => router.push(`/menu?locationId=${locationId}`),
  );

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitOrderAction();
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setStatus("PENDING_APPROVAL");
    });
  }

  // The − / + on a line: save the new quantity (same addons and note),
  // then reflect it locally.
  function handleQuantityChange(line: CartLine, next: number) {
    setError(null);
    startTransition(async () => {
      const result = await updateCartItemAction(
        line.id,
        next,
        line.addonIds ?? [],
        line.note ?? undefined,
      );
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setCart((current) =>
        current.map((item) =>
          item.id === line.id ? { ...item, quantity: next } : item,
        ),
      );
    });
  }

  function handleRemove(orderId: number) {
    setError(null);
    startTransition(async () => {
      const result = await removeFromCartAction(orderId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setCart((current) => current.filter((line) => line.id !== orderId));
    });
  }

  // Only shown once the current round is PENDING/COOKING. No server
  // call here anymore — the next round is started LAZILY, on the menu
  // page, the moment the customer actually adds an item (see
  // OrderSessionService.getOrStartCartRound) — so this is just
  // navigation, same as goBackToMenu below.
  function handleOrderMore() {
    router.push(`/menu?locationId=${locationId}`);
    router.refresh();
  }

  // router.push + refresh (not a plain <Link>) — a soft <Link> nav here
  // was seen to occasionally leave this page's own tree mounted while
  // the URL updated to /menu (a Next.js Router Cache quirk); refresh()
  // forces the destination to always re-fetch fresh Server Component
  // output instead of trusting any cached entry.
  function goBackToMenu() {
    router.push(`/menu?locationId=${locationId}`);
    router.refresh();
  }

  // Approved by the counter: show the order-confirmed screen for as long
  // as this round is the current one — on the live approval and on any
  // later visit to /cart. "Order more" starts a new round (a fresh
  // cart), which is what takes the customer off it.
  if (status === "PENDING" || status === "COOKING") {
    return (
      <OrderConfirmedScreen
        orderNumber={orderNumber}
        itemCount={cart.length}
        total={roundTotal}
        seeOrderHref={`/history/${sessionId}?locationId=${locationId}`}
        onBack={goBackToMenu}
        onOrderMore={handleOrderMore}
        isPending={isPending}
      />
    );
  }

  // An empty cart — a fresh round after "Order more", or the last item was
  // removed — is just the empty state, never the confirmed screen (that's
  // tied to a round that's still PENDING/COOKING, handled above).
  if (cart.length === 0) {
    return (
      <EmptyCartState onBack={goBackToMenu} onBrowseMenu={goBackToMenu} />
    );
  }

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          maxWidth: 720,
          mx: "auto",
          width: "100%",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", mb: 2 }}
        >
          <BackCircleButton ariaLabel="Back to menu" onClick={goBackToMenu} />
          <Stack>
            <Typography variant="h6">{orderNumber}</Typography>
            <Typography variant="caption" color="text.secondary">
              {shopName ?? "Café Maw"}
            </Typography>
          </Stack>
        </Stack>

        {hasEarlierRound && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Your earlier order is with the kitchen — these items will be
            sent as a new order.
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
        >
          <Box
            sx={{
              border: "1px solid",
              borderColor: "divider",
              borderRadius: 3,
              p: 1.5,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              minHeight: 0,
            }}
          >
            <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              <CartList
                cart={cart}
                shortages={initialShortages}
                editable={status === "CART"}
                isPending={isPending}
                onRemove={handleRemove}
                onEdit={setEditingItem}
                onQuantityChange={handleQuantityChange}
              />
            </Box>
            {status === "CART" ? (
              <Box sx={{ pt: 1.5 }}>
                <Divider sx={{ mb: 1.5 }} />
                <Stack
                  direction="row"
                  sx={{ justifyContent: "space-between", mb: 1.5 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Total Price
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {cartTotal.toLocaleString()} MMK
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    sx={{
                      flex: 1,
                      whiteSpace: "nowrap",
                      transition:
                        "transform 0.15s ease, background-color 0.15s ease",
                      [hoverCapableMedia]: {
                        "&:hover": {
                          transform: "translateY(-1px)",
                          bgcolor: "action.hover",
                        },
                      },
                    }}
                    onClick={goBackToMenu}
                  >
                    Add More
                  </Button>
                  <Box sx={{ flex: 2 }}>
                    <CartButton
                      status={status}
                      disabled={isPending || cart.length === 0 || hasShortage}
                      onClick={handleSubmit}
                    />
                  </Box>
                </Stack>
              </Box>
            ) : (
              <Box sx={{ pt: 1.5 }}>
                <CartButton
                  status={status}
                  disabled={isPending || cart.length === 0 || hasShortage}
                  onClick={handleSubmit}
                />
              </Box>
            )}
          </Box>
          {hasShortage && status === "CART" && (
            <Typography
              variant="caption"
              color="error"
              sx={{ display: "block", mt: 1 }}
            >
              Some items in your cart just ran out — edit or cancel them
              below before submitting.
            </Typography>
          )}
        </Box>
      </Box>

      <MenuDetailDialog
        open={editingItem !== null}
        menuId={editingItem?.menuId ?? null}
        locationId={locationId}
        canOrder
        onClose={() => setEditingItem(null)}
        editing={
          editingItem
            ? {
                quantity: editingItem.quantity,
                addonIds: editingItem.addonIds ?? [],
                note: editingItem.note ?? undefined,
              }
            : undefined
        }
        onSubmit={async (_menuId, quantity, addonIds, note) => {
          if (!editingItem) return "Nothing to update.";
          const result = await updateCartItemAction(
            editingItem.id,
            quantity,
            addonIds,
            note,
          );
          if (!result.success) {
            return result.error.message;
          }
          setCart((current) =>
            current.map((line) =>
              line.id === editingItem.id
                ? { ...line, quantity, addonIds, note: note || null }
                : line,
            ),
          );
          return null;
        }}
      />
    </Box>
  );
}
