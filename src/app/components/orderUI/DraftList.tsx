"use client";

import { Card, Divider, Stack, Typography } from "@mui/material";
import {
  contributorGroupHeading,
  groupByContributor,
} from "@/app/lib/contributors";
import { formatAmount } from "@/app/lib/orderFormat";
import {
  CartLineRow,
  DraftLine,
  Shortage,
} from "@/app/(storefront)/cart/CartList";

interface DraftListProps {
  draftItems: DraftLine[];
  shortages?: Shortage[];
  /** The round already sent to the kitchen: the same per-person cards,
   *  but nobody's lines can be changed any more. */
  readOnly?: boolean;
  onRemove?: (orderId: number) => void;
  onEdit?: (item: DraftLine) => void;
  onQuantityChange?: (item: DraftLine, next: number) => void;
  isPending?: boolean;
}

/**
 * Per-customer cards (design mock: "Your order" / "Customer 2 order") —
 * one card per person, yours first (groupByContributor), each with its
 * subtotal. Who's who comes as labels; the tokens never reach the
 * browser. Before Send, only YOUR lines are tappable (edit), have the
 * − / + stepper and the ✕ remove; everyone else's picks are visible but
 * read-only — mirroring TableDraftService's ownership checks, which the
 * server still enforces. After Send (`readOnly`) the round keeps the
 * same cards, with nothing editable.
 */
export default function DraftList({
  draftItems,
  shortages = [],
  readOnly = false,
  onRemove,
  onEdit,
  onQuantityChange,
  isPending = false,
}: DraftListProps) {
  if (draftItems.length === 0) return null;

  const shortageByMenuId = new Map(
    shortages.map((shortage) => [shortage.menuId, shortage]),
  );

  return (
    <Stack spacing={1.5} sx={{ mb: 3 }}>
      {groupByContributor(draftItems).map((group) => {
        const editable = !readOnly && group.isMine;
        return (
          <Card key={group.key} variant="outlined" sx={{ p: 1.5 }}>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {contributorGroupHeading(group.label)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {formatAmount(group.subtotal)}
              </Typography>
            </Stack>

            <Stack
              spacing={1}
              divider={<Divider flexItem sx={{ opacity: 0.5 }} />}
            >
              {group.lines.map((item) => (
                <CartLineRow
                  key={item.id}
                  line={item}
                  shortage={shortageByMenuId.get(item.menuId)}
                  actionable={editable}
                  disabled={isPending}
                  onEdit={editable ? () => onEdit?.(item) : undefined}
                  onRemove={editable ? () => onRemove?.(item.id) : undefined}
                  onQuantityChange={
                    editable
                      ? (next) => onQuantityChange?.(item, next)
                      : undefined
                  }
                />
              ))}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
