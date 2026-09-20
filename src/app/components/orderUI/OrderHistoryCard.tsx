"use client";

import Link from "next/link";
import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { ORDER_STATUS_CHIP } from "./OrderReceipt";

interface OrderHistoryCardProps {
  /** The order's receipt page — the whole card is the link. */
  href: string;
  orderNumber: string;
  status: string;
  items: { quantity: number; name: string }[];
  total: number;
}

/** How many item names the one-line summary spells out before
 *  collapsing the rest into "+N more" — the receipt has the full list. */
const SUMMARY_ITEMS = 2;

/**
 * One order in the history list: number, status, a one-line summary of
 * what's in it, item count and total. Deliberately not the full line
 * items — tapping the card opens the receipt (history/[orderId]) for
 * those, so this list stays scannable when a table has several rounds.
 */
export default function OrderHistoryCard({
  href,
  orderNumber,
  status,
  items,
  total,
}: OrderHistoryCardProps) {
  const chip = ORDER_STATUS_CHIP[status] ?? {
    label: status,
    color: "default" as const,
  };
  const shown = items
    .slice(0, SUMMARY_ITEMS)
    .map((item) => `${item.quantity} × ${item.name}`)
    .join(", ");
  const hidden = items.length - SUMMARY_ITEMS;

  return (
    <Card
      component={Link}
      href={href}
      variant="outlined"
      sx={{
        display: "block",
        p: 1.5,
        color: "inherit",
        textDecoration: "none",
        "&:hover": { borderColor: "primary.main" },
      }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", mb: 0.5 }}
          >
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {orderNumber}
            </Typography>
            <Chip label={chip.label} color={chip.color} size="small" />
          </Stack>
          <Typography
            variant="body2"
            color="text.secondary"
            noWrap
            sx={{ mb: 0.75 }}
          >
            {shown}
            {hidden > 0 ? ` +${hidden} more` : ""}
          </Typography>
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              {total.toLocaleString()} MMK
            </Typography>
          </Stack>
        </Box>
        <ChevronRightIcon sx={{ color: "text.secondary" }} />
      </Stack>
    </Card>
  );
}
