"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from "@mui/material";

import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import ActiveRoundBanner, { ActiveRound } from "./ActiveRoundBanner";
import DraftList from "./DraftList";
import CartButton, { CartButtonStatus } from "./CartButton";
import MenuDetailDialog from "./MenuDetailDialog";
import BackCircleButton from "./BackCircleButton";
import OrderConfirmedScreen from "./OrderConfirmedScreen";
import EmptyCartState from "./EmptyCartState";
import { usePolling } from "@/app/lib/hooks/usePolling";
import {
  dismissConfirmedRound,
  useConfirmedRoundDismissed,
} from "@/app/lib/hooks/useConfirmedRoundDismissed";
import {
  pollTableAction,
  removeDraftItemAction,
  submitDraftAction,
  updateDraftItemAction,
} from "@/app/(storefront)/counter/action";
import CartList, {
  CartLine,
  DraftLine,
  Shortage,
} from "@/app/(storefront)/cart/CartList";

const POLL_INTERVAL_MS = 4000;

interface TableCartPageClientProps {
  tableId: number;
  locationId: number;
  shopName: string | null;
  myContributorToken: string;
  initialDraftItems: DraftLine[];
  initialActiveRound: ActiveRound | null;
  /** The active round's line items (already merged by Send to Kitchen) —
   *  what this page keeps showing once the draft has become a round. */
  initialRoundItems: CartLine[];
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
  initialRoundItems,
  initialShortages,
}: TableCartPageClientProps) {
  const router = useRouter();
  const [draftItems, setDraftItems] = useState(initialDraftItems);
  const [activeRound, setActiveRound] = useState(initialActiveRound);
  // Has the customer already moved on from this round's "Order confirmed"
  // screen (tapped "Order more" / added to the next order)? null = not
  // known yet (see the hook).
  const confirmedDismissed = useConfirmedRoundDismissed(
    tableId,
    activeRound?.id,
  );
  const [roundItems, setRoundItems] = useState(initialRoundItems);
  // True from the tap on Send to Kitchen until the new round's state has
  // been applied — drives the button's "Waiting counter approval" look
  // right away, without the list going anywhere.
  const [isSending, setIsSending] = useState(false);
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
      setRoundItems(result.roundItems);
      setShortages(result.shortages);
    },
  );

  // Nothing left to draft, but a round is in flight: keep showing what
  // was sent (read-only) with the round's status on the button, the same
  // way the Counter cart does after Submit — rather than an empty page
  // with just a status chip.
  const showingRound = draftItems.length === 0 && activeRound !== null;
  const roundTotal = roundItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  // CartButton doubles as the status indicator (spinner while waiting,
  // a check once confirmed): the round's own status when one is in
  // flight, "waiting" from the moment Send to Kitchen is tapped, else
  // the normal clickable state.
  const buttonStatus: CartButtonStatus = showingRound
    ? ((activeRound?.status ?? "PENDING_APPROVAL") as CartButtonStatus)
    : isSending
      ? "PENDING_APPROVAL"
      : "CART";

  const draftTotal = useMemo(
    () => draftItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [draftItems],
  );
  const hasShortage = shortages.length > 0;

  // The − / + on one of MY lines: save the new quantity (same addons and
  // note), then reflect it locally.
  function handleQuantityChange(line: DraftLine, next: number) {
    setError(null);
    startTransition(async () => {
      const result = await updateDraftItemAction(
        tableId,
        line.id,
        next,
        line.addonIds,
        line.note ?? undefined,
      );
      if (!result.success) {
        setError(result.error.message);
        return;
      }
      setDraftItems((current) =>
        current.map((item) =>
          item.id === line.id ? { ...item, quantity: next } : item,
        ),
      );
    });
  }

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
    setIsSending(true);
    startTransition(async () => {
      const result = await submitDraftAction(tableId, locationId);
      if (!result.success) {
        setError(result.error.message);
        setIsSending(false);
        return;
      }
      // The draft is now a round (merged server-side). Pull the real
      // state right away instead of waiting up to a poll tick — and
      // instead of clearing the list locally, which is what used to
      // leave the page empty apart from the status chip. Table stays
      // open for drafting a next round.
      const fresh = await pollTableAction(tableId, locationId);
      if (fresh.authorized) {
        setDraftItems(fresh.draftItems);
        setActiveRound(fresh.activeRound);
        setRoundItems(fresh.roundItems);
        setShortages(fresh.shortages);
      } else {
        router.refresh();
      }
      setIsSending(false);
    });
  }

  function goBackToMenu() {
    router.push(`/menu?locationId=${locationId}&tableId=${tableId}`);
    router.refresh();
  }

  // The latest round has been approved and nothing new is being drafted:
  // show the order-confirmed screen — until the customer moves on with
  // "Order more" (or adds something to the next order), which is
  // remembered per round. After that the cart is simply empty; the
  // confirmation must not keep coming back.
  const isRoundApproved =
    showingRound &&
    (activeRound?.status === "PENDING" || activeRound?.status === "COOKING");
  if (isRoundApproved && activeRound && activeRound.id !== undefined) {
    // Storage can't be read during the server render — wait until we know
    // rather than flashing a screen that may be about to be replaced.
    if (confirmedDismissed === null) return null;
    if (!confirmedDismissed) {
      const roundId = activeRound.id;
      return (
        <OrderConfirmedScreen
          orderNumber={activeRound.orderNumber}
          itemCount={roundItems.length}
          total={activeRound.total ?? 0}
          seeOrderHref={`/history/${roundId}?locationId=${locationId}&tableId=${tableId}`}
          onBack={goBackToMenu}
          onOrderMore={() => {
            dismissConfirmedRound(tableId, roundId);
            goBackToMenu();
          }}
        />
      );
    }
  }

  // Nothing to review: no draft and no round still in flight (none yet, or
  // the last one is approved and already dismissed).
  if (draftItems.length === 0 && (!showingRound || isRoundApproved)) {
    return (
      <EmptyCartState onBack={goBackToMenu} onBrowseMenu={goBackToMenu} />
    );
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
          spacing={1.5}
          sx={{ alignItems: "center", mb: 2 }}
        >
          <BackCircleButton ariaLabel="Back to menu" onClick={goBackToMenu} />
          <Stack>
            <Typography variant="h6">Table order</Typography>
            <Typography variant="caption" color="text.secondary">
              {shopName ?? "Café Maw"}
            </Typography>
          </Stack>
        </Stack>

        {!showingRound && <ActiveRoundBanner activeRound={activeRound} />}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

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
              {showingRound ? (
                <CartList
                  cart={roundItems}
                  title={`Sent to kitchen · ${activeRound?.orderNumber ?? ""}`}
                />
              ) : (
                <DraftList
                  draftItems={draftItems}
                  myContributorToken={myContributorToken}
                  shortages={shortages}
                  onRemove={handleRemove}
                  onEdit={(item) => setEditingItem(item)}
                  onQuantityChange={handleQuantityChange}
                  isPending={isPending || isSending}
                />
              )}
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
                  {(showingRound ? roundTotal : draftTotal).toLocaleString()}{" "}
                  MMK
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
                    [hoverCapableMedia]: {
                      "&:hover": {
                        transform: "translateY(-1px)",
                        bgcolor: "action.hover",
                      },
                    },
                  }}
                  onClick={goBackToMenu}
                >
                  Add More
                </Button>
                <Box sx={{ flex: 2 }}>
                  <CartButton
                    status={buttonStatus}
                    disabled={
                      isPending ||
                      isSending ||
                      draftItems.length === 0 ||
                      hasShortage
                    }
                    onClick={handleSendToKitchen}
                    submitLabel="Send to Kitchen"
                  />
                </Box>
              </Stack>
            </Box>
          </Box>
          {hasShortage && !showingRound && (
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
      </Box>

      <MenuDetailDialog
        open={editingItem !== null}
        menuId={editingItem?.menuId ?? null}
        locationId={locationId}
        canOrder
        onClose={() => setEditingItem(null)}
        editing={
          editingItem
            ? {
                quantity: editingItem.quantity,
                addonIds: editingItem.addonIds,
                note: editingItem.note ?? undefined,
              }
            : undefined
        }
        onSubmit={async (_menuId, quantity, addonIds, note) => {
          if (!editingItem) return "Nothing to update.";
          const result = await updateDraftItemAction(
            tableId,
            editingItem.id,
            quantity,
            addonIds,
            note,
          );
          if (!result.success) {
            return result.error.message;
          }
          setDraftItems((current) =>
            current.map((item) =>
              item.id === editingItem.id
                ? { ...item, quantity, addonIds, note: note || null }
                : item,
            ),
          );
          return null;
        }}
      />
    </Box>
  );
}
