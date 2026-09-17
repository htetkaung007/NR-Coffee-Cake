"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

import ActiveRoundBanner, { ActiveRound } from "./ActiveRoundBanner";
import DraftList from "./DraftList";
import CartButton from "./CartButton";
import MenuDetailDialog from "./MenuDetailDialog";
import { usePolling } from "@/app/lib/hooks/usePolling";
import {
  pollTableAction,
  removeDraftItemAction,
  submitDraftAction,
  updateDraftItemAction,
} from "@/app/(storefront)/counter/action";
import { DraftLine, Shortage } from "@/app/(storefront)/cart/Cartlist";

const POLL_INTERVAL_MS = 4000;

interface TableCartPageClientProps {
  tableId: number;
  locationId: number;
  shopName: string | null;
  myContributorToken: string;
  initialDraftItems: DraftLine[];
  initialActiveRound: ActiveRound | null;
  initialShortages: Shortage[];
}

/**
 * Table QR's cart page — parallel to CartPageClient, but reviewing the
 * shared draft rather than a private session cart (see the design
 * discussion: "Customer 1 order" / "Customer 2 order" cards, only
 * mine editable). Send to Kitchen merges every contributor's picks
 * into a new round (TableDraftService.submitDraft) and clears the
 * draft — it does NOT navigate away the way Counter's Submit does,
 * since a table can keep drafting a next round immediately after
 * (see ActiveRoundBanner's own comment on the two being independent).
 */
export default function TableCartPageClient({
  tableId,
  locationId,
  shopName,
  myContributorToken,
  initialDraftItems,
  initialActiveRound,
  initialShortages,
}: TableCartPageClientProps) {
  const router = useRouter();
  const [draftItems, setDraftItems] = useState(initialDraftItems);
  const [activeRound, setActiveRound] = useState(initialActiveRound);
  const [shortages, setShortages] = useState(initialShortages);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [editingItem, setEditingItem] = useState<DraftLine | null>(null);

  usePolling(
    true,
    POLL_INTERVAL_MS,
    () => pollTableAction(tableId, locationId),
    (result) => {
      if (!result.authorized) {
        router.refresh();
        return;
      }
      setDraftItems(result.draftItems);
      setActiveRound(result.activeRound);
      setShortages(result.shortages);
    },
  );

  const draftTotal = useMemo(
    () => draftItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [draftItems],
  );
  const hasShortage = shortages.length > 0;

  function handleRemove(orderId: number) {
    setError(null);
    startTransition(async () => {
      const result = await removeDraftItemAction(tableId, orderId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setDraftItems((current) => current.filter((item) => item.id !== orderId));
    });
  }

  function handleSendToKitchen() {
    setError(null);
    startTransition(async () => {
      const result = await submitDraftAction(tableId, locationId);
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      // The merged draft is now a round — clear it locally rather than
      // waiting for the next poll tick, and let ActiveRoundBanner (on
      // its next poll update) pick up the new round's status. Table
      // stays open for immediately drafting a next round.
      setDraftItems([]);
    });
  }

  function goBackToMenu() {
    router.push(`/menu?locationId=${locationId}&tableId=${tableId}`);
    router.refresh();
  }

  return (
    <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
      <Box
        sx={{
          p: { xs: 2, sm: 3 },
          maxWidth: 720,
          mx: "auto",
          width: "100%",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
        }}
      >
        <Stack
          direction="row"
          spacing={0.5}
          sx={{ alignItems: "center", mb: 2 }}
        >
          <IconButton
            size="small"
            aria-label="Back to menu"
            onClick={goBackToMenu}
          >
            <ArrowBackIcon fontSize="small" />
          </IconButton>
          <Stack>
            <Typography variant="h6">Table order</Typography>
            <Typography variant="caption" color="text.secondary">
              {shopName ?? "Café Maw"}
            </Typography>
          </Stack>
        </Stack>

        <ActiveRoundBanner activeRound={activeRound} />

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {draftItems.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            Nothing in the draft yet — go back to the menu to add something.
          </Typography>
        ) : (
          <Box
            sx={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
          >
            <Box
              sx={{
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 3,
                p: 1.5,
                flex: 1,
                display: "flex",
                flexDirection: "column",
                minHeight: 0,
              }}
            >
              <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
                <DraftList
                  draftItems={draftItems}
                  myContributorToken={myContributorToken}
                  shortages={shortages}
                  onRemove={handleRemove}
                  onEdit={(item) => setEditingItem(item)}
                  isPending={isPending}
                />
              </Box>
              <Box sx={{ pt: 1.5 }}>
                <Divider sx={{ mb: 1.5 }} />
                <Stack
                  direction="row"
                  sx={{ justifyContent: "space-between", mb: 1.5 }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Total Price
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    {draftTotal.toLocaleString()} MMK
                  </Typography>
                </Stack>
                <Stack direction="row" spacing={1}>
                  <Button
                    variant="outlined"
                    sx={{
                      flex: 1,
                      whiteSpace: "nowrap",
                      transition:
                        "transform 0.15s ease, background-color 0.15s ease",
                      "&:hover": {
                        transform: "translateY(-1px)",
                        bgcolor: "action.hover",
                      },
                    }}
                    onClick={goBackToMenu}
                  >
                    Add More
                  </Button>
                  <Box sx={{ flex: 2 }}>
                    <CartButton
                      status="CART"
                      disabled={isPending || draftItems.length === 0 || hasShortage}
                      onClick={handleSendToKitchen}
                      submitLabel="Send to Kitchen"
                    />
                  </Box>
                </Stack>
              </Box>
            </Box>
            {hasShortage && (
              <Typography
                variant="caption"
                color="error"
                sx={{ display: "block", mt: 1 }}
              >
                Some items ran out — remove or reduce them before sending to the
                kitchen.
              </Typography>
            )}
          </Box>
        )}
      </Box>

      <MenuDetailDialog
        open={editingItem !== null}
        menuId={editingItem?.menuId ?? null}
        locationId={locationId}
        canOrder
        onClose={() => setEditingItem(null)}
        editing={
          editingItem
            ? { quantity: editingItem.quantity, addonIds: editingItem.addonIds }
            : undefined
        }
        onSubmit={async (_menuId, quantity, addonIds) => {
          if (!editingItem) return "Nothing to update.";
          const result = await updateDraftItemAction(
            tableId,
            editingItem.id,
            quantity,
            addonIds,
          );
          if (!result.success) {
            return result.error.message;
          }
          setDraftItems((current) =>
            current.map((item) =>
              item.id === editingItem.id
                ? { ...item, quantity, addonIds }
                : item,
            ),
          );
          return null;
        }}
      />
    </Box>
  );
}
