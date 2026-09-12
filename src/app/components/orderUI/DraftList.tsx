"use client";

import { Box, Button, Card, Stack, Typography } from "@mui/material";
import { DraftLine, Shortage } from "@/app/cart/Cartlist";

interface DraftListProps {
  draftItems: DraftLine[];
  myContributorToken: string;
  shortages?: Shortage[];
  onRemove: (orderId: number) => void;
  onEdit: (item: DraftLine) => void;
  isPending: boolean;
}

/**
 * Per-customer draft review (design mock: "Customer 1 order" /
 * "Customer 2 order" as separate cards) — one card per contributor
 * that has picked anything, mine first. Only MY card gets working
 * Edit/Cancel buttons per item; everyone else's picks are visible (the
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

            <Stack spacing={1}>
              {items.map((item) => {
                const shortage = shortageByMenuId.get(item.menuId);
                return (
                  <Box key={item.id} sx={{ opacity: shortage ? 0.5 : 1 }}>
                    <Stack
                      direction="row"
                      sx={{
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <Box>
                        <Typography variant="body2">
                          {item.quantity} × {item.menuName}
                        </Typography>
                        {item.addonNames.length > 0 && (
                          <Typography variant="caption" color="text.secondary">
                            + {item.addonNames.join(", ")}
                          </Typography>
                        )}
                      </Box>
                      <Stack
                        direction="row"
                        spacing={0.5}
                        sx={{ alignItems: "center" }}
                      >
                        <Typography variant="body2">
                          {(item.price * item.quantity).toLocaleString()} MMK
                        </Typography>
                        {isMine && (
                          <>
                            <Button
                              size="small"
                              disabled={isPending}
                              onClick={() => onEdit(item)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="small"
                              color="error"
                              disabled={isPending}
                              onClick={() => onRemove(item.id)}
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                      </Stack>
                    </Stack>
                    {shortage && (
                      <Typography variant="caption" color="error">
                        {shortage.available > 0
                          ? `Only ${shortage.available} left`
                          : "This just sold out"}
                        {isMine ? " — please edit or cancel." : "."}
                      </Typography>
                    )}
                  </Box>
                );
              })}
            </Stack>
          </Card>
        );
      })}
    </Stack>
  );
}
