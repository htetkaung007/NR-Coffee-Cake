"use client";

import Link from "next/link";
import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { formatAmount } from "@/app/lib/orderFormat";

import { ORDER_STATUS_CHIP } from "./OrderReceipt";

interface HistoryItem {
  quantity: number;
  name: string;
}

interface OrderHistoryCardProps {
  /** The order's receipt page — the whole card is the link. */
  href: string;
  orderNumber: string;
  status: string;
  items: HistoryItem[];
  /** Table QR: the same items per person ("You", "Customer 2"…), one
   *  summary line each with that person's subtotal. Counter: absent. */
  groups?: { key: string; label: string; items: HistoryItem[]; subtotal: number }[];
  total: number;
}

/** "1 × Latte, 1 × Cake +2 more" — a one-line summary of some items. */
function summarize(items: HistoryItem[]) {
  const shown = items
    .slice(0, SUMMARY_ITEMS)
    .map((item) => `${item.quantity} × ${item.name}`)
    .join(", ");
  const hidden = items.length - SUMMARY_ITEMS;
  return `${shown}${hidden > 0 ? ` +${hidden} more` : ""}`;
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
  groups,
  total,
}: OrderHistoryCardProps) {
  const chip = ORDER_STATUS_CHIP[status] ?? {
    label: status,
    color: "default" as const,
  };

  return (
    <Card
      component={Link}
      href={href}
      elevation={0}
      sx={{
        display: "block",
        p: { xs: 1.5, sm: 2 },
        color: "inherit",
        textDecoration: "none",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        overflow: "hidden",
        mx: "auto",
        minWidth: { xs: "100%", sm: 320 },
        maxWidth: { xs: "100%", sm: 720 },
        minHeight: { xs: 88, sm: 104 },
        transition: "transform 0.2s ease, box-shadow 0.2s ease",
        [hoverCapableMedia]: {
          "&:hover": {
            borderColor: "primary.main",
            transform: "translateY(-2px)",
            boxShadow: 2,
          },
        },
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
          {groups ? (
            // One line per person, so each customer finds their own.
            <Box sx={{ mb: 0.75 }}>
              {groups.map((group) => (
                <Stack
                  key={group.key}
                  direction="row"
                  spacing={1}
                  sx={{ justifyContent: "space-between" }}
                >
                  <Typography variant="body2" color="text.secondary" noWrap>
                    <Box component="span" sx={{ fontWeight: 700 }}>
                      {group.label}:
                    </Box>{" "}
                    {summarize(group.items)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ flexShrink: 0 }}
                  >
                    {formatAmount(group.subtotal)}
                  </Typography>
                </Stack>
              ))}
            </Box>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              noWrap
              sx={{ mb: 0.75 }}
            >
              {summarize(items)}
            </Typography>
          )}
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">
              {items.length} {items.length === 1 ? "item" : "items"}
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontWeight: 700, color: "primary.main" }}
            >
              {formatAmount(total)}
            </Typography>
          </Stack>
        </Box>
        <ChevronRightIcon sx={{ color: "text.secondary" }} />
      </Stack>
    </Card>
  );
}
