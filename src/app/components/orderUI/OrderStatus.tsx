"use client";

import { Box, Chip, Stack, Typography } from "@mui/material";
import OrderTopBar from "./OrderTopBar";

interface OrderStatusScreenCartLine {
  id: number;
  menuName: string;
  quantity: number;
}

interface OrderStatusScreenProps {
  status: "PENDING_APPROVAL" | "PENDING" | "COOKING";
  orderNumber: string;
  cart: OrderStatusScreenCartLine[];
  shopName: string | null;
}

/**
 * Read-only "where's my order" screen — the customer can't edit the
 * cart or browse the menu here (see MenuBrowser for that). One
 * component for all three post-submit statuses since they only differ
 * in headline copy and whether a confirmation Chip shows; splitting
 * further would just duplicate the same Box/Typography scaffolding
 * three times.
 */
export default function OrderStatusScreen({
  status,
  orderNumber,
  cart,
  shopName,
}: OrderStatusScreenProps) {
  const isWaitingForApproval = status === "PENDING_APPROVAL";

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <OrderTopBar shopName={shopName} cartItemCount={cart.length} />
      <Box sx={{ p: 3, maxWidth: 480, mx: "auto", textAlign: "center" }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {orderNumber}
        </Typography>

        {isWaitingForApproval ? (
          <>
            <Typography variant="body1" sx={{ mb: 2 }}>
              Waiting for counter approval...
            </Typography>
            <Stack spacing={1}>
              {cart.map((line) => (
                <Typography
                  key={line.id}
                  variant="body2"
                  color="text.secondary"
                >
                  {line.quantity} × {line.menuName}
                </Typography>
              ))}
            </Stack>
          </>
        ) : (
          <>
            <Chip label="Order confirmed" color="success" sx={{ mb: 2 }} />
            <Typography variant="body2" color="text.secondary">
              Your order is being prepared.
            </Typography>
          </>
        )}
      </Box>
    </Box>
  );
}
