"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  Stack,
  Typography,
} from "@mui/material";
import {
  pollOrderStatusAction,
  addToCartAction,
  submitOrderAction,
} from "../action";

interface MenuOption {
  id: number;
  name: string;
  price: number;
  description: string;
}

interface CartLine {
  id: number;
  menuName: string;
  quantity: number;
  price: number;
}

interface CounterOrderClientProps {
  hasSession: boolean;
  locationId: number;
  orderNumber: string;
  initialStatus: string;
  initialCart: CartLine[];
  menus: MenuOption[];
}

const POLL_INTERVAL_MS = 4000;

export default function CounterOrderClient({
  hasSession,
  locationId,
  orderNumber,
  initialStatus,
  initialCart,
  menus,
}: CounterOrderClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [cart, setCart] = useState(initialCart);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Design doc "Step 3: Polling" — originally only polled once
  // submitted (PENDING_APPROVAL), since a lone customer's own cart
  // can't change out from under them. Now also polls during CART:
  // Table QR sessions are shared across a group's phones (see
  // TABLE_SESSION_COOKIE), so Person B's screen needs to notice when
  // Person A adds something. hasSession=false ရင် order/cart
  // လုံးဝမရှိသေးလို့ (view-only browsing) poll လုပ်စရာမလိုဘူး.
  useEffect(() => {
    if (!hasSession) return;
    if (status !== "CART" && status !== "PENDING_APPROVAL") return;

    const interval = setInterval(async () => {
      const result = await pollOrderStatusAction();
      // Any terminal outcome (approved-then-paid isn't reachable from
      // here, but rejected or timed-out is) clears the cookie
      // server-side (see pollOrderStatusAction) — the client needs to
      // leave this page for all of them, not just PAID, or it's left
      // showing a cart the server will no longer accept actions for.
      const isTerminalOutcome =
        result.status === "no_session" ||
        result.status === "PAID" ||
        result.status === "CANCELLED" ||
        result.status === "COMPLETED";

      if (isTerminalOutcome) {
        router.push(`/menu?locationId=${locationId}`);
        return;
      }
      setStatus(result.status);
      setCart(result.cart);
    }, POLL_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [hasSession, status, locationId, router]);

  function handleAdd(menu: MenuOption) {
    setError(null);
    startTransition(async () => {
      const result = await addToCartAction(menu.id, 1);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setCart((current) => [
        ...current,
        {
          id: result.data.id,
          menuName: menu.name,
          quantity: 1,
          price: menu.price,
        },
      ]);
    });
  }

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

  if (hasSession && status === "PENDING_APPROVAL") {
    return (
      <Box sx={{ p: 3, maxWidth: 480, mx: "auto", textAlign: "center" }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {orderNumber}
        </Typography>
        <Typography variant="body1" sx={{ mb: 2 }}>
          Waiting for counter approval...
        </Typography>
        <Stack spacing={1}>
          {cart.map((line) => (
            <Typography key={line.id} variant="body2" color="text.secondary">
              {line.quantity} × {line.menuName}
            </Typography>
          ))}
        </Stack>
      </Box>
    );
  }

  if (hasSession && (status === "PENDING" || status === "COOKING")) {
    return (
      <Box sx={{ p: 3, maxWidth: 480, mx: "auto", textAlign: "center" }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {orderNumber}
        </Typography>
        <Chip label="Order confirmed" color="success" sx={{ mb: 2 }} />
        <Typography variant="body2" color="text.secondary">
          Your order is being prepared.
        </Typography>
      </Box>
    );
  }

  // CART — still building the order (session ရှိသူ), or view-only
  // browsing (session မရှိသူ — hasSession=false).
  return (
    <Box sx={{ p: 3, maxWidth: 480, mx: "auto" }}>
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
          ? "Add items, then submit for counter approval."
          : "Browse the menu. Scan the table or counter QR to place an order."}
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {menus.map((menu) => (
          <Card
            key={menu.id}
            variant="outlined"
            sx={{
              p: 1.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
            }}
          >
            <Box>
              <Typography variant="body1">{menu.name}</Typography>
              <Typography variant="caption" color="text.secondary">
                {menu.price.toLocaleString()} MMK
              </Typography>
            </Box>
            {hasSession && (
              <Button
                size="small"
                variant="outlined"
                disabled={isPending}
                onClick={() => handleAdd(menu)}
              >
                Add
              </Button>
            )}
          </Card>
        ))}
      </Stack>

      {hasSession && cart.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
            Your order
          </Typography>
          <Stack spacing={0.5}>
            {cart.map((line) => (
              <Stack
                key={line.id}
                direction="row"
                sx={{ justifyContent: "space-between" }}
              >
                <Typography variant="body2">
                  {line.quantity} × {line.menuName}
                </Typography>
                <Typography variant="body2">
                  {(line.price * line.quantity).toLocaleString()} MMK
                </Typography>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}

      {hasSession && (
        <Button
          variant="contained"
          fullWidth
          disabled={isPending || cart.length === 0}
          onClick={handleSubmit}
        >
          Submit Order
        </Button>
      )}
    </Box>
  );
}
