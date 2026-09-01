"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, IconButton, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import OrderTopBar from "./OrderTopBar";

import {
  pollOrderStatusAction,
  submitOrderAction,
} from "@/app/customer/action";
import CartList, { CartLine } from "@/app/cart/Cartlist";
import CartButton, { CartButtonStatus } from "./CartButton";

interface CartPageClientProps {
  locationId: number;
  orderNumber: string;
  shopName: string | null;
  initialStatus: CartButtonStatus;
  initialCart: CartLine[];
}

const POLL_INTERVAL_MS = 4000;

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
}: CartPageClientProps) {
  const router = useRouter();
  const [cart, setCart] = useState(initialCart);
  const [status, setStatus] = useState<CartButtonStatus>(initialStatus);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const cartTotal = useMemo(
    () => cart.reduce((sum, line) => sum + line.price * line.quantity, 0),
    [cart],
  );

  // Only starts once submitted — while still in CART on this page,
  // there's nothing server-side that could change without this
  // customer's own action (unlike /menu's browsing view, which polls
  // even pre-submit for shared Table sessions).
  useEffect(() => {
    if (status !== "PENDING_APPROVAL") return;

    const interval = setInterval(async () => {
      const result = await pollOrderStatusAction();
      const isTerminalOutcome =
        result.status === "no_session" ||
        result.status === "PAID" ||
        result.status === "CANCELLED" ||
        result.status === "COMPLETED";

      if (isTerminalOutcome) {
        router.push(`/menu?locationId=${locationId}`);
        return;
      }
      setStatus(result.status as CartButtonStatus);
      setCart(result.cart);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [status, locationId, router]);

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
            <CartList cart={cart} />
            <CartButton
              status={status}
              itemCount={cart.length}
              total={cartTotal}
              disabled={isPending || cart.length === 0}
              onClick={handleSubmit}
            />
          </>
        )}
      </Box>
    </Box>
  );
}
