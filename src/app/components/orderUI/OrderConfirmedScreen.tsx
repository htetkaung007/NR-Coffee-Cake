"use client";

import Link from "next/link";
import {
  Avatar,
  Box,
  Button,
  Card,
  Stack,
  Typography,
} from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";

import BackCircleButton from "./BackCircleButton";

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
    <Box
      sx={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        p: 3,
        position: "relative",
      }}
    >
      <BackCircleButton
        ariaLabel="Back to menu"
        onClick={onBack}
        sx={{ position: "absolute", top: 16, left: 16 }}
      />
      <Stack sx={{ width: "100%", maxWidth: 400, alignItems: "center" }}>
        <Avatar
          sx={{
            width: 96,
            height: 96,
            mb: 3,
            bgcolor: "success.main",
            color: "success.contrastText",
          }}
        >
          <CheckIcon sx={{ fontSize: 52 }} />
        </Avatar>

        <Typography variant="h6" sx={{ mb: 1 }}>
          Order confirmed
        </Typography>
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", mb: 3 }}
        >
          Order {orderNumber} has been approved by the counter — the kitchen
          is preparing it now.
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
                {total.toLocaleString()} MMK
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
      </Stack>
    </Box>
  );
}
