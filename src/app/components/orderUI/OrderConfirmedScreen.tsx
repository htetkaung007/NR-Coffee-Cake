"use client";

import Link from "next/link";
import { Box, Button, Card, Stack, Typography } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import { formatAmount } from "@/app/lib/orderFormat";

import OutcomeScreenShell from "./OutcomeScreenShell";

interface OrderConfirmedScreenProps {
  orderNumber: string;
  /** Number of order lines (not units). */
  itemCount: number;
  total: number;
  /** Receipt page for this order — see history/[orderId]. */
  seeOrderHref: string;
  /** Back arrow — returns to the menu. */
  onBack: () => void;
  onOrderMore: () => void;
  isPending?: boolean;
}

/**
 * The cart page's view of an order the counter has approved (see
 * CartPageClient / TableCartPageClient) — shown for as long as the
 * customer hasn't started a new order, with the next steps: look at the
 * order's receipt, or "Order more" (which is what gets them back to a
 * cart). The back arrow just returns to the menu. All colors come from
 * the Od theme.
 */
export default function OrderConfirmedScreen({
  orderNumber,
  itemCount,
  total,
  seeOrderHref,
  onBack,
  onOrderMore,
  isPending = false,
}: OrderConfirmedScreenProps) {
  return (
    <OutcomeScreenShell
      onBack={onBack}
      tone="success"
      icon={<CheckIcon sx={{ fontSize: 52 }} />}
    >
      <Typography variant="h6" sx={{ mb: 1 }}>
        Order confirmed
      </Typography>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ textAlign: "center", mb: 3 }}
      >
        Order {orderNumber} has been approved by the counter — the kitchen is
        preparing it now.
      </Typography>

      <Card variant="outlined" sx={{ width: "100%", p: 2, mb: 3 }}>
        <Stack direction="row" sx={{ justifyContent: "space-between" }}>
          <Box>
            <Typography variant="caption" color="text.secondary">
              Items
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {itemCount}
            </Typography>
          </Box>
          <Box sx={{ textAlign: "right" }}>
            <Typography variant="caption" color="text.secondary">
              Total
            </Typography>
            <Typography
              variant="body1"
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              {formatAmount(total)}
            </Typography>
          </Box>
        </Stack>
      </Card>

      <Stack spacing={1.5} sx={{ width: "100%" }}>
        <Button
          component={Link}
          href={seeOrderHref}
          variant="outlined"
          fullWidth
          sx={{ borderRadius: 999, py: 1.25 }}
        >
          See your order
        </Button>
        <Button
          variant="contained"
          fullWidth
          disabled={isPending}
          onClick={onOrderMore}
          sx={{ borderRadius: 999, py: 1.25 }}
        >
          Order more
        </Button>
      </Stack>
    </OutcomeScreenShell>
  );
}
