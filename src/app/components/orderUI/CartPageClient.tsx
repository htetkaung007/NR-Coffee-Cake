"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import OrderTopBar from "./OrderTopBar";
import { usePollOrderStatus } from "./usePollOrderStatus";

import { startNextRoundAction, submitOrderAction } from "@/app/customer/action";
import CartList, { CartLine, Shortage } from "@/app/cart/Cartlist";
import CartButton, { CartButtonStatus } from "./CartButton";

interface CartPageClientProps {
  locationId: number;
  orderNumber: string;
  shopName: string | null;
  initialStatus: CartButtonStatus;
  initialCart: CartLine[];
  /** Snapshot taken at page load — see Cartlist.tsx's own comment on
   *  why Counter's cart just shows this (dimmed, disables Submit)
   *  rather than letting the customer fix it themselves: there's no
   *  polling pre-submit here (a lone Counter customer's own cart can't
   *  change from anyone but them — see counterorderclient.tsx), so
   *  this can go stale between load and submit; the real enforcement
   *  is still the atomic decrementStock inside submitOrderForApproval,
   *  same as it always was. */
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
    <Box sx={{ minHeight: "100vh" }}>
      <OrderTopBar shopName={shopName} cartItemCount={cart.length} />
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 720, mx: "auto" }}>
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
          <Typography variant="h6">{orderNumber}</Typography>
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
          <>
            <CartList cart={cart} shortages={initialShortages} />
            <CartButton
              status={status}
              itemCount={cart.length}
              total={cartTotal}
              disabled={isPending || cart.length === 0 || hasShortage}
              onClick={handleSubmit}
            />
            {hasShortage && status === "CART" && (
              <Typography
                variant="caption"
                color="error"
                sx={{ display: "block", mt: 1 }}
              >
                Some items in your cart just ran out — please ask staff for help
                before submitting.
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
          </>
        )}
      </Box>
    </Box>
  );
}
