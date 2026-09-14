"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import { usePollOrderStatus } from "./usePollOrderStatus";

import {
  removeFromCartAction,
  startNextRoundAction,
  submitOrderAction,
  updateCartItemAction,
} from "@/app/(storefront)/customer/action";
import CartList, { CartLine, Shortage } from "@/app/(storefront)/cart/Cartlist";
import CartButton, { CartButtonStatus } from "./CartButton";
import MenuDetailDialog from "./MenuDetailDialog";

interface CartPageClientProps {
  locationId: number;
  orderNumber: string;
  shopName: string | null;
  initialStatus: CartButtonStatus;
  initialCart: CartLine[];
  /** Snapshot taken at page load — there's no polling pre-submit here
   *  (a lone Counter customer's own cart can't change from anyone but
   *  them — see counterorderclient.tsx), so this can go stale between
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
  locationId,
  orderNumber,
  shopName,
  initialStatus,
  initialCart,
  initialShortages,
}: CartPageClientProps) {
  const router = useRouter();
  const [cart, setCart] = useState(initialCart);
  const [status, setStatus] = useState<CartButtonStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<CartLine | null>(null);
  const hasShortage = initialShortages.length > 0;

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart],
  );

  // Only starts once submitted — while still in CART on this page,
  // there's nothing server-side that could change without this
  // customer's own action (unlike /menu's browsing view, which polls
  // even pre-submit for shared Table sessions — see
  // counterorderclient.tsx's isTableSession).
  usePollOrderStatus(
    status === "PENDING_APPROVAL",
    (result) => {
      setStatus(result.status as CartButtonStatus);
      setCart(result.cart);
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

  // Only shown once the current round is PENDING/COOKING (see
  // startNextRoundAction / OrderSessionService.startNextRound for the
  // gate) — a fresh round means a fresh cart, so this navigates back
  // to /menu rather than staying here once it succeeds.
  function handleOrderMore() {
    setError(null);
    startTransition(async () => {
      const result = await startNextRoundAction();
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      router.push(`/menu?locationId=${locationId}`);
      router.refresh();
    });
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
          spacing={0.5}
          sx={{ alignItems: "center", mb: 2 }}
        >
          <IconButton
            size="small"
            aria-label="Back to menu"
            onClick={goBackToMenu}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Stack>
            <Typography variant="h6">{orderNumber}</Typography>
            <Typography variant="caption" color="text.secondary">
              {shopName ?? "Café Maw"}
            </Typography>
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {cart.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Your cart is empty — go back to the menu to add something.
          </Typography>
        ) : (
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
                        "&:hover": {
                          transform: "translateY(-1px)",
                          bgcolor: "action.hover",
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
            {(status === "PENDING" || status === "COOKING") && (
              <Button
                variant="outlined"
                fullWidth
                disabled={isPending}
                onClick={handleOrderMore}
                sx={{ mt: 1.5 }}
              >
                Order More
              </Button>
            )}
          </Box>
        )}
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
              }
            : undefined
        }
        onSubmit={async (_menuId, quantity, addonIds) => {
          if (!editingItem) return "Nothing to update.";
          const result = await updateCartItemAction(
            editingItem.id,
            quantity,
            addonIds,
          );
          if (!result.success) {
            return result.error.message;
          }
          setCart((current) =>
            current.map((line) =>
              line.id === editingItem.id
                ? { ...line, quantity, addonIds }
                : line,
            ),
          );
          return null;
        }}
      />
    </Box>
  );
}
