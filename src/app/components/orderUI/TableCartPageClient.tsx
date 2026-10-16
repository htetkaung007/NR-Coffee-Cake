"use client";

import { useTranslations } from "next-intl";
import { useErrorMessage } from "@/app/lib/hooks/useErrorMessage";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Alert, Box, Stack, Typography } from "@mui/material";

import { cartLinesTotal, sumQuantities } from "@/app/lib/order/orderTotals";
import { useBottomBarPage } from "./OrderBotBar";
import { toLineAddons } from "@/app/lib/order/lineAddons";
import ActiveRoundBanner, { ActiveRound } from "./ActiveRoundBanner";
import ApprovalWaitingPanel from "./ApprovalWaitingPanel";
import DraftList from "./DraftList";
import CartButton, { CartButtonStatus } from "./CartButton";
import MenuDetailDialog from "./MenuDetailDialog";
import OrderConfirmedScreen from "./OrderConfirmedScreen";
import OrderRejectedScreen from "./OrderRejectedScreen";
import EmptyCartState from "./EmptyCartState";
import { usePolling } from "@/app/lib/hooks/usePolling";
import {
  dismissConfirmedRound,
  dismissRejectedRound,
  useConfirmedRoundDismissed,
  useRejectedRoundDismissed,
} from "@/app/lib/hooks/useRoundDismissed";
import type { ShownCancelReason } from "@/app/lib/order/roundOutcome";
import {
  changeRoundAction,
  pollTableAction,
  removeDraftItemAction,
  submitDraftAction,
  updateDraftItemAction,
  withdrawRoundAction,
} from "@/app/(storefront)/table/action";
import WithdrawRoundControls from "./WithdrawRoundControls";
import type {
  DraftLine,
  LabelledCartLine,
  Shortage,
} from "@/app/(storefront)/cart/CartList";
import {
  AddMoreButton,
  CartListPanel,
  CartPageHeader,
  CartPageShell,
  CartTotalRow,
} from "./CartPageParts";

const POLL_INTERVAL_MS = 4000;

interface TableCartPageClientProps {
  tableId: number;
  /** "Table 3" — for the Cancel order confirm; null if unknown. */
  tableName: string | null;
  locationId: number;
  shopName: string | null;
  initialDraftItems: DraftLine[];
  initialActiveRound: ActiveRound | null;
  /** The active round's line items — each customer's own lines (Send to
   *  Kitchen merges per customer only), labelled with who ordered them —
   *  what this page keeps showing once the draft has become a round. */
  initialRoundItems: LabelledCartLine[];
  initialShortages: Shortage[];
  /** The table's last round, if the counter turned it down or let it
   *  expire (see TableSessionService.getRejectedRoundForTable). */
  initialRejectedRound: RejectedRound | null;
}

interface RejectedRound {
  id: number;
  orderNumber: string;
  cancelReason: ShownCancelReason;
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
  tableName,
  locationId,
  shopName,
  initialDraftItems,
  initialActiveRound,
  initialRoundItems,
  initialShortages,
  initialRejectedRound,
}: TableCartPageClientProps) {
  const router = useRouter();
  const t = useTranslations("cart");
  const errorMessage = useErrorMessage();
  const tCommon = useTranslations("common");
  const [draftItems, setDraftItems] = useState(initialDraftItems);
  useBottomBarPage({
    cartCount: sumQuantities(draftItems),
    locationId,
    tableId,
  });
  const [activeRound, setActiveRound] = useState(initialActiveRound);
  // Has the customer already moved on from this round's "Order confirmed"
  // screen (tapped "Order more" / added to the next order)? null = not
  // known yet (see the hook).
  const confirmedDismissed = useConfirmedRoundDismissed(
    tableId,
    activeRound?.id,
  );
  const [roundItems, setRoundItems] = useState(initialRoundItems);
  const [rejectedRound, setRejectedRound] = useState(initialRejectedRound);
  // Same per-round memory as the confirmed screen, under its own key.
  const rejectedDismissed = useRejectedRoundDismissed(
    tableId,
    rejectedRound?.id,
  );
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
      setRejectedRound(result.rejectedRound);
    },
  );

  // Nothing left to draft, but a round is in flight: keep showing what
  // was sent (read-only) with the round's status on the button, the same
  // way the Counter cart does after Submit — rather than an empty page
  // with just a status chip.
  const showingRound = draftItems.length === 0 && activeRound !== null;
  const roundTotal = cartLinesTotal(roundItems);
  // CartButton doubles as the status indicator (spinner while waiting,
  // a check once confirmed): the round's own status when one is in
  // flight, "waiting" from the moment Send to Kitchen is tapped, else
  // the normal clickable state.
  const buttonStatus: CartButtonStatus = showingRound
    ? ((activeRound?.status ?? "PENDING_APPROVAL") as CartButtonStatus)
    : isSending
      ? "PENDING_APPROVAL"
      : "CART";

  const draftTotal = useMemo(() => cartLinesTotal(draftItems), [draftItems]);
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
        line.addons.map((addon) => addon.id),
        line.note ?? undefined,
      );
      if (!result.success) {
        setError(errorMessage(result.error));
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
        setError(errorMessage(result.error));
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
        setError(errorMessage(result.error));
        setIsSending(false);
        return;
      }
      // The draft is now a round (merged server-side). Pull the real
      // state right away instead of waiting up to a poll tick — and
      // instead of clearing the list locally, which is what used to
      // leave the page empty apart from the status chip. Table stays
      // open for drafting a next round.
      await refreshNow();
      setIsSending(false);
    });
  }

  /** Pulls the table's state right away instead of waiting for a poll. */
  async function refreshNow() {
    const fresh = await pollTableAction(tableId, locationId);
    if (fresh.authorized) {
      setDraftItems(fresh.draftItems);
      setActiveRound(fresh.activeRound);
      setRoundItems(fresh.roundItems);
      setShortages(fresh.shortages);
      setRejectedRound(fresh.rejectedRound);
    } else {
      router.refresh();
    }
  }

  /** "Change order" / "Cancel order" on the waiting round — for everyone
   *  at the table. This phone did it, so it skips the "was cancelled"
   *  screen the other phones see; Change brings the lines back as the
   *  shared draft to edit. */
  async function withdrawOwnRound(mode: "change" | "cancel") {
    const roundId = activeRound?.id;
    const result =
      mode === "change"
        ? await changeRoundAction(tableId)
        : await withdrawRoundAction(tableId);
    if (result.success && roundId !== undefined) {
      dismissRejectedRound(tableId, roundId);
    }
    await refreshNow();
    return result;
  }

  function goBackToMenu() {
    router.push(`/menu?locationId=${locationId}&tableId=${tableId}`);
    router.refresh();
  }

  // The latest round was turned down (or expired) and nobody has started
  // a new draft yet: say so once, instead of an unexplained empty cart.
  // Drafts are per contributor on the server, so nothing is restored.
  if (rejectedRound && activeRound === null && draftItems.length === 0) {
    // Storage can't be read during the server render — wait until known.
    if (rejectedDismissed === null) return null;
    if (!rejectedDismissed) {
      const roundId = rejectedRound.id;
      return (
        <OrderRejectedScreen
          orderNumber={rejectedRound.orderNumber}
          reason={rejectedRound.cancelReason}
          nextStep={t("tableRejectedNextStep")}
          primaryLabel={tCommon("backToMenu")}
          onPrimary={() => {
            dismissRejectedRound(tableId, roundId);
            goBackToMenu();
          }}
          onBack={() => {
            dismissRejectedRound(tableId, roundId);
            goBackToMenu();
          }}
        />
      );
    }
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
    return <EmptyCartState onBack={goBackToMenu} onBrowseMenu={goBackToMenu} />;
  }

  return (
    <>
      <CartPageShell>
        <CartPageHeader
          title={t("tableOrder")}
          shopName={shopName}
          onBack={goBackToMenu}
        />

        {!showingRound && <ActiveRoundBanner activeRound={activeRound} />}

        {/* Same place as on the Counter cart page: the round's calm,
           soft countdown (a Table round is never cancelled — past its
           target it reads "taking a little longer"). */}
        {showingRound &&
          activeRound?.status === "PENDING_APPROVAL" &&
          activeRound.approval && (
            <ApprovalWaitingPanel
              orderNumber={activeRound.orderNumber}
              approval={activeRound.approval}
            >
              <WithdrawRoundControls
                confirmMessage={t("tableCancelConfirm", {
                  table: tableName ?? t("yourTable"),
                })}
                onChange={() => withdrawOwnRound("change")}
                onCancel={() => withdrawOwnRound("cancel")}
              />
            </ApprovalWaitingPanel>
          )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <CartListPanel>
            <Box sx={{ flex: 1, overflowY: "auto", minHeight: 0 }}>
              {showingRound ? (
                <>
                  <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 700 }}>
                    {t("sentToKitchen", { number: activeRound?.orderNumber ?? "" })}
                  </Typography>
                  {/* Same per-person cards as before Send, read-only. */}
                  <DraftList draftItems={roundItems} readOnly />
                </>
              ) : (
                <DraftList
                  draftItems={draftItems}
                  shortages={shortages}
                  onRemove={handleRemove}
                  onEdit={(item) => setEditingItem(item)}
                  onQuantityChange={handleQuantityChange}
                  isPending={isPending || isSending}
                />
              )}
            </Box>
            <Box sx={{ pt: 1.5 }}>
              <CartTotalRow
                amount={showingRound ? roundTotal : draftTotal}
                mb={1.5}
              />
              <Stack direction="row" spacing={1}>
                <AddMoreButton onClick={goBackToMenu} />
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
                    submitLabel={t("sendToKitchen")}
                  />
                </Box>
              </Stack>
            </Box>
          </CartListPanel>
          {hasShortage && !showingRound && (
            <Typography
              variant="caption"
              color="error"
              sx={{ display: "block", mt: 1 }}
            >
              {t("shortage")}
            </Typography>
          )}
        </Box>
      </CartPageShell>

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
                addonIds: editingItem.addons.map((addon) => addon.id),
                note: editingItem.note ?? undefined,
              }
            : undefined
        }
        onSubmit={async (_menuId, quantity, addonIds, note) => {
          if (!editingItem) return tCommon("nothingToUpdate");
          const result = await updateDraftItemAction(
            tableId,
            editingItem.id,
            quantity,
            addonIds,
            note,
          );
          if (!result.success) {
            return errorMessage(result.error);
          }
          // The server's saved line — its add-ons carry their own
          // price snapshots, which the line total needs.
          const saved = result.data;
          setDraftItems((current) =>
            current.map((item) =>
              item.id === saved.id
                ? {
                    ...item,
                    quantity: saved.quantity,
                    addons: toLineAddons(saved.OrdersAddons),
                    note: saved.note,
                  }
                : item,
            ),
          );
          return null;
        }}
      />
    </>
  );
}
