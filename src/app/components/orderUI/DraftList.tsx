"use client";

import { Card, Divider, Stack, Typography } from "@mui/material";
import {
  CartLineRow,
  DraftLine,
  Shortage,
} from "@/app/(storefront)/cart/Cartlist";

interface DraftListProps {
  draftItems: DraftLine[];
  myContributorToken: string;
  shortages?: Shortage[];
  onRemove: (orderId: number) => void;
  onEdit: (item: DraftLine) => void;
  onQuantityChange: (item: DraftLine, next: number) => void;
  isPending: boolean;
}

/**
 * Per-customer draft review (design mock: "Customer 1 order" /
 * "Customer 2 order" as separate cards) — one card per contributor
 * that has picked anything, mine first. Only MY card's lines are
 * tappable (edit), have the − / + quantity stepper and the ✕ remove;
 * everyone else's picks are visible (the
 * whole point of a shared draft) but read-only — see
 * TableDraftService.removeDraftItem/updateDraftItem's ownership
 * checks, which this UI mirrors rather than relying on alone (a
 * disabled-looking button that still tried the request would just
 * surface a server error for something the UI could have prevented
 * outright).
 */
export default function DraftList({
  draftItems,
  myContributorToken,
  shortages = [],
  onRemove,
  onEdit,
  onQuantityChange,
  isPending,
}: DraftListProps) {
  if (draftItems.length === 0) return null;

  const shortageByMenuId = new Map(
    shortages.map((shortage) => [shortage.menuId, shortage]),
  );

  const byContributor = new Map<string, DraftLine[]>();
  for (const item of draftItems) {
    const existing = byContributor.get(item.contributorToken);
    if (existing) existing.push(item);
    else byContributor.set(item.contributorToken, [item]);
  }

  // Mine first — the person looking at this screen cares most about
  // what they themselves picked; everyone else's cards follow in
  // whatever order they first added something.
  const contributors = Array.from(byContributor.keys()).sort((a) =>
    a === myContributorToken ? -1 : 1,
  );

  return (
    <Stack spacing={1.5} sx={{ mb: 3 }}>
      {contributors.map((token, index) => {
        const isMine = token === myContributorToken;
        const items = byContributor.get(token)!;
        const subtotal = items.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0,
        );

        return (
          <Card key={token} variant="outlined" sx={{ p: 1.5 }}>
            <Stack
              direction="row"
              sx={{ justifyContent: "space-between", mb: 1 }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {isMine ? "Your order" : `Customer ${index + 1} order`}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {subtotal.toLocaleString()} MMK
              </Typography>
            </Stack>

            <Stack
              spacing={1}
              divider={<Divider flexItem sx={{ opacity: 0.5 }} />}
            >
              {items.map((item) => (
                <CartLineRow
                  key={item.id}
                  line={item}
                  shortage={shortageByMenuId.get(item.menuId)}
                  addons={item.addonNames}
                  actionable={isMine}
                  disabled={isPending}
                  onEdit={() => onEdit(item)}
                  onRemove={() => onRemove(item.id)}
                  onQuantityChange={(next) => onQuantityChange(item, next)}
                />
              ))}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
