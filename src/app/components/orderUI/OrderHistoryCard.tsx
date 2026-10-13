"use client";

import { useCustomerPrice } from "@/app/lib/hooks/useCustomerPrice";
import Link from "next/link";
import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";

import { useTranslations } from "next-intl";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import type { ContributorWho } from "@/app/lib/order/contributors";
import { useCustomerLabels } from "@/app/lib/hooks/useCustomerLabels";

import { statusChipColor } from "./OrderReceipt";

interface HistoryItem {
  /** What's still on the order (staff-voided units left out). */
  quantity: number;
  name: string;
  /** Units staff took back off it (0/absent: none). */
  removed?: number;
}

interface OrderHistoryCardProps {
  /** The order's receipt page — the whole card is the link. */
  href: string;
  orderNumber: string;
  status: string;
  items: HistoryItem[];
  /** Table QR: the same items per person ("You", "Customer 2"… — put
   *  into words here), one summary line each with that person's
   *  subtotal. Counter: absent. */
  groups?: { key: string; who: ContributorWho; items: HistoryItem[]; subtotal: number }[];
  total: number;
}

/** "1 × Latte, 1 × Cake +2 more" — a one-line summary of what's still
 *  on the order (an item staff took back entirely isn't in it — the
 *  receipt lists it, struck through). `more` words the "+N more". */
function summarize(allItems: HistoryItem[], more: (count: number) => string) {
  const items = allItems.filter((item) => item.quantity > 0);
  const shown = items
    .slice(0, SUMMARY_ITEMS)
    .map((item) => `${item.quantity} × ${item.name}`)
    .join(", ");
  const hidden = items.length - SUMMARY_ITEMS;
  return `${shown}${hidden > 0 ? ` ${more(hidden)}` : ""}`;
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
  const t = useTranslations("history");
  const { price } = useCustomerPrice();
  const labels = useCustomerLabels();
  const more = (count: number) => t("more", { count });
  const kept = items.filter((item) => item.quantity > 0);
  const isWithdrawn = status === "WITHDRAWN";
  const removed = items.reduce((sum, item) => sum + (item.removed ?? 0), 0);

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
            <Chip
              label={labels.roundStatus(status)}
              color={statusChipColor(status)}
              size="small"
            />
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
                      {labels.contributorLabel(group.who)}:
                    </Box>{" "}
                    {summarize(group.items, more)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ flexShrink: 0 }}
                  >
                    {price(group.subtotal)}
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
              {summarize(items, more)}
            </Typography>
          )}
          <Stack direction="row" sx={{ justifyContent: "space-between" }}>
            <Typography variant="caption" color="text.secondary">
              {t("itemCount", { count: kept.length })}
              {removed > 0 && ` · ${t("removedCount", { count: removed })}`}
            </Typography>
            <Typography
              variant="body2"
              sx={
                isWithdrawn
                  ? // Cancelled by the customer: never charged — struck
                    // through, beside the "Cancelled by you" chip.
                    { color: "text.secondary", textDecoration: "line-through" }
                  : { fontWeight: 700, color: "primary.main" }
              }
            >
              {price(total)}
            </Typography>
          </Stack>
        </Box>
        <ChevronRightIcon sx={{ color: "text.secondary" }} />
      </Stack>
    </Card>
  );
}
