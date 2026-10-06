"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";

import { usePollOrderStatus } from "@/app/lib/hooks/usePollOrderStatus";
import type { ApprovalTiming } from "@/app/lib/approvalTiming";
import ApprovalWaitingPanel from "./ApprovalWaitingPanel";
import { useBrowserCart } from "@/app/lib/hooks/useBrowserCart";
import { useCartValidation } from "@/app/lib/hooks/useCartValidation";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { cartLineTotal, cartLinesTotal } from "@/app/lib/orderTotals";
import {
  toBrowserCartLine,
  toServerLines,
  type BrowserCartLine,
} from "@/app/lib/browserCart";
import {
  decideSubmit,
  type SendState,
  type ValidatedCartLine,
} from "@/app/lib/cartValidation";
import { formatAmount } from "@/app/lib/orderFormat";

import {
  getSubmittedOrderOutcomeAction,
  submitCartAction,
} from "@/app/(storefront)/cart/action";
import { shownCancelReason, type ShownCancelReason } from "@/app/lib/roundOutcome";
import CartList, {
  CartLineRow,
  type CartLine,
} from "@/app/(storefront)/cart/CartList";
import CartButton, { CartButtonStatus } from "./CartButton";
import CartLineNotice from "./CartLineNotice";
import MenuDetailDialog from "./MenuDetailDialog";
import BackCircleButton from "./BackCircleButton";
import OrderConfirmedScreen from "./OrderConfirmedScreen";
import OrderRejectedScreen from "./OrderRejectedScreen";
import EmptyCartState from "./EmptyCartState";
import CounterQrScannerDialog from "./CounterQrScannerDialog";

interface CartPageClientProps {
  locationId: number;
  shopName: string | null;
  /** The Counter session the scan cookie points at, or null (never
   *  scanned here, or the scan has expired) — then the cart can still be
   *  built and checked, just not sent. */
  session: {
    /** The current round — for the receipt link once it's confirmed. */
    id: number;
    status: CartButtonStatus;
    /** The BILL's number (matches the cashier's Order List card). */
    billNumber: string;
    /** The current round's lines as the server has them — shown while
     *  it's awaiting approval, and counted on the confirmed screen. */
    roundLines: CartLine[];
    roundTotal: number;
    /** This bill already has an order with the kitchen, so what's in
     *  the cart will go as a NEW order next to it. */
    hasEarlierRound: boolean;
    /** Time left for the counter to confirm (server clock); null when
     *  the round isn't waiting or has no deadline. */
    approval: ApprovalTiming | null;
  } | null;
  /** Could this browser send right now — the server's answer at render
   *  time; every later check updates it (see useCartValidation). */
  initialSendState: SendState;
  /** Arrived straight from scanning the counter QR (/counter/continue) —
   *  shows a one-time "you can send now" banner. */
  justScanned: boolean;
}

/** A browser cart line in the row shape CartLineRow renders. */
function toRowLine(line: BrowserCartLine, index: number): CartLine {
  return {
    id: index,
    menuId: line.menuId,
    menuName: line.display.name,
    quantity: line.quantity,
    price: line.display.unitPrice,
    imageUrl: line.display.imageUrl,
    addons: line.display.addons,
    note: line.note,
  };
}

const canBeOrdered = (line: ValidatedCartLine | null) =>
  line === null || line.status === "ok" || line.status === "priceChanged";

/**
 * The Counter cart page. The cart itself lives in this browser (see
 * useBrowserCart); the server checks it (validateCartAction) whenever the
 * page opens, the cart changes, or the customer comes back to the tab,
 * and every total shown is the server's once that check is in. Sending
 * (submitCartAction) re-checks on the server and either places the
 * order or says what to look at first.
 *
 * Once an order is placed the page follows its round as before: the
 * Submit button doubles as the status while the counter decides, and an
 * accepted order shows the confirmed screen until the customer starts a
 * new cart ("Order more").
 */
export default function CartPageClient({
  locationId,
  shopName,
  session,
  initialSendState,
  justScanned,
}: CartPageClientProps) {
  const router = useRouter();
  const browserCart = useBrowserCart(locationId);
  const { cart } = browserCart;
  const validation = useCartValidation(
    locationId,
    cart,
    browserCart.applyValidation,
    initialSendState,
  );
  const { sendState } = validation;

  const [status, setStatus] = useState<CartButtonStatus>(
    session?.status ?? "CART",
  );
  const [roundLines, setRoundLines] = useState(session?.roundLines ?? []);
  const [roundTotal, setRoundTotal] = useState(session?.roundTotal ?? 0);
  // Time left to confirm — re-synced from the server on every poll.
  const [approval, setApproval] = useState(session?.approval ?? null);
  // The in-app scanner — mounted only while open (see requestScan).
  const [scannerOpen, setScannerOpen] = useState(false);
  const scanButtonRef = useRef<HTMLButtonElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, startSubmit] = useTransition();
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  // A sent round the counter turned down or let expire — from the live
  // poll, or looked up later by the remembered submission's request id.
  const [rejection, setRejection] = useState<{
    sessionId: number;
    orderNumber: string;
    reason: ShownCancelReason;
  } | null>(null);
  const isWaiting = status === "PENDING_APPROVAL";

  /** The items go back into the cart (once — see restoreAfterRejection)
   *  and the screen explains why. */
  function handleRejected(found: NonNullable<typeof rejection>) {
    browserCart.restoreAfterRejection(found.sessionId);
    setRejection(found);
    setStatus("CART");
  }

  // Only while the counter is deciding — the same polling as before the
  // cart moved to the browser.
  usePollOrderStatus(
    isWaiting,
    (result) => {
      setStatus(result.status as CartButtonStatus);
      setRoundLines(result.cart);
      setRoundTotal(result.total);
      setApproval(("approval" in result ? result.approval : null) ?? null);
      // Accepted: nothing will need restoring.
      if (result.status === "PENDING" || result.status === "COOKING") {
        browserCart.forgetLastSubmitted();
      }
    },
    (result) => {
      const reason =
        result.status === "no_session"
          ? null
          : shownCancelReason(result.status, result.cancelReason);
      const roundId = cart.lastSubmitted?.sessionId ?? session?.id;
      if (reason && roundId !== undefined && result.status !== "no_session") {
        handleRejected({
          sessionId: roundId,
          orderNumber: result.orderNumber,
          reason,
        });
        return;
      }
      goBackToMenu();
    },
  );

  // Not watching when it was decided (another page, tab closed): ask what
  // became of the remembered submission — by then the scan cookie may be
  // gone, the request id is not.
  const lastRequestId = cart.lastSubmitted?.clientRequestId;
  const latest = useRef({ handleRejected, forget: browserCart.forgetLastSubmitted });
  useEffect(() => {
    latest.current = {
      handleRejected,
      forget: browserCart.forgetLastSubmitted,
    };
  });
  useEffect(() => {
    if (!lastRequestId || isWaiting) return;
    let current = true;
    getSubmittedOrderOutcomeAction({ clientRequestId: lastRequestId })
      .then((response) => {
        if (!current || !response.success || !response.data) return;
        const outcome = response.data;
        if (outcome.cancelReason) {
          latest.current.handleRejected({
            sessionId: outcome.sessionId,
            orderNumber: outcome.orderNumber,
            reason: outcome.cancelReason,
          });
        } else if (outcome.status !== "PENDING_APPROVAL") {
          // Accepted (or otherwise settled): nothing to restore.
          latest.current.forget();
        }
      })
      .catch(() => {
        // Offline — asked again next time the page opens.
      });
    return () => {
      current = false;
    };
  }, [lastRequestId, isWaiting]);

  // The "scanned" marker is one-time: drop it from the address so a
  // reload or Back doesn't show the banner again.
  useEffect(() => {
    if (!justScanned) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("scanned");
    window.history.replaceState(null, "", url);
  }, [justScanned]);

  /** Opens the in-app counter-QR scanner. It loads the camera library
   *  only now, and falls back to explaining the phone's own camera
   *  whenever the camera can't be used — either way the counter QR
   *  brings the customer back to this cart (see /counter/continue). */
  function requestScan() {
    setScannerOpen(true);
  }

  function closeScanner() {
    setScannerOpen(false);
    // Back to the button that opened it (DESIGN.md Rule 22).
    scanButtonRef.current?.focus();
  }

  // router.push + refresh (not a plain <Link>) — see the menu page: a
  // soft navigation here could leave this tree mounted on /menu.
  function goBackToMenu() {
    router.push(`/menu?locationId=${locationId}`);
    router.refresh();
  }

  const rowLines = cart.lines.map(toRowLine);
  const result = validation.result;
  const checkedLines = cart.lines.map((_, index) => result?.lines[index] ?? null);
  // Server numbers once the check is in; until then, what was shown when
  // each item was added.
  const total = result ? result.total : cartLinesTotal(rowLines);
  const decision = result ? decideSubmit(result) : null;
  const blockedCount = checkedLines.filter((line) => !canBeOrdered(line)).length;
  const removableIndexes = checkedLines.flatMap((line, index) =>
    line?.status === "soldOut" || line?.status === "unavailable" ? [index] : [],
  );

  /** How many of a short menu THIS line can keep, with the menu's other
   *  lines as they are (they share one stock). */
  function fitQuantity(index: number) {
    const available = checkedLines[index]?.availableQuantity ?? 0;
    const others = cart.lines.reduce(
      (sum, line, i) =>
        i !== index && line.menuId === cart.lines[index].menuId
          ? sum + line.quantity
          : sum,
      0,
    );
    return Math.max(0, available - others);
  }

  function handleSubmit() {
    const clientRequestId = cart.clientRequestId;
    if (!clientRequestId) return;
    const sentLines = rowLines;
    const sentTotal = total;
    setError(null);
    startSubmit(async () => {
      let response;
      try {
        response = await submitCartAction({
          locationId,
          lines: toServerLines(cart),
          clientRequestId,
        });
      } catch {
        // The same request id goes with a retry, so it can never place
        // the order twice.
        setError(
          "Couldn't reach the counter. Check your connection and tap Submit again — your order won't be sent twice.",
        );
        return;
      }
      if (!response.success) {
        setError(response.error.message);
        return;
      }
      const outcome = response.data;
      switch (outcome.status) {
        case "submitted":
          // Show the order waiting right away; the refresh then loads the
          // round from the server (the page remounts on the new round).
          setRoundLines(sentLines);
          setRoundTotal(sentTotal);
          setStatus("PENDING_APPROVAL");
          // Remembered until the counter decides — restored if rejected.
          browserCart.recordSubmission(outcome.sessionId);
          router.refresh();
          return;
        case "needsScan":
        case "awaitingApproval":
          validation.reportSendState(outcome.status);
          return;
        case "pricesChanged":
        case "needsAttention":
          validation.showResult(outcome.validation);
          return;
      }
    });
  }

  if (!browserCart.isLoaded) {
    // The stored cart is read right after hydration — don't flash
    // "your cart is empty" before it is.
    return <Box sx={{ minHeight: "100dvh" }} />;
  }

  // Turned down: shown while this round's submission is still remembered
  // — both buttons forget it, so it never comes back for this round.
  if (rejection && cart.lastSubmitted?.sessionId === rejection.sessionId) {
    return (
      <OrderRejectedScreen
        orderNumber={rejection.orderNumber}
        reason={rejection.reason}
        nextStep="Your items are back in your cart — change them if you like and send again."
        primaryLabel="Review my cart"
        onPrimary={() => browserCart.forgetLastSubmitted()}
        secondaryLabel="Back to menu"
        onSecondary={() => {
          browserCart.forgetLastSubmitted();
          goBackToMenu();
        }}
        onBack={() => {
          browserCart.forgetLastSubmitted();
          goBackToMenu();
        }}
      />
    );
  }

  // Accepted by the counter, and no new cart started yet.
  if (session && (status === "PENDING" || status === "COOKING") && cart.lines.length === 0) {
    return (
      <OrderConfirmedScreen
        orderNumber={session.billNumber}
        itemCount={roundLines.length}
        total={roundTotal}
        seeOrderHref={`/history/${session.id}?locationId=${locationId}`}
        onBack={goBackToMenu}
        onOrderMore={goBackToMenu}
      />
    );
  }

  if (status !== "PENDING_APPROVAL" && cart.lines.length === 0) {
    return (
      <EmptyCartState onBack={goBackToMenu} onBrowseMenu={goBackToMenu} />
    );
  }

  const sendDisabledReason =
    sendState === "awaitingApproval"
      ? "Your last order is waiting for the counter to confirm."
      : decision === "needsAttention"
        ? "Fix the items marked above before sending."
        : null;
  const editingLine = editingIndex !== null ? cart.lines[editingIndex] : null;

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
            <Typography variant="h6">
              {session?.billNumber ?? "Your cart"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {shopName ?? "Café Maw"}
            </Typography>
          </Stack>
        </Stack>

        {isWaiting && session && (
          <ApprovalWaitingPanel
            orderNumber={session.billNumber}
            approval={approval}
          />
        )}

        {!isWaiting && (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {justScanned && sendState === "canSend" && (
              <Alert severity="success" role="status">
                ✓ Scanned — you can send your order now.
              </Alert>
            )}
            {session?.hasEarlierRound && (
              <Alert severity="info">
                Your earlier order is with the kitchen — these items will be
                sent as a new order.
              </Alert>
            )}
            {blockedCount > 0 && (
              <Alert
                severity="warning"
                action={
                  removableIndexes.length > 0 ? (
                    <Button
                      color="inherit"
                      size="small"
                      sx={{ minHeight: 44 }}
                      onClick={() => browserCart.removeLines(removableIndexes)}
                    >
                      Remove unavailable items
                    </Button>
                  ) : undefined
                }
              >
                Some items changed — review before sending.
              </Alert>
            )}
            {validation.failed && (
              <Alert
                severity="warning"
                action={
                  <Button
                    color="inherit"
                    size="small"
                    sx={{ minHeight: 44 }}
                    onClick={() => void validation.retry()}
                  >
                    Retry
                  </Button>
                }
              >
                Couldn&apos;t check the latest prices. You can still send —
                the counter checks them again.
              </Alert>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}

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
            {isWaiting ? (
              <CartList cart={roundLines} />
            ) : (
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" sx={{ mb: 0.5, fontWeight: 700 }}>
                  Your order
                </Typography>
                <Stack divider={<Divider />}>
                  {rowLines.map((rowLine, index) => {
                    const checked = checkedLines[index];
                    const blocked = !canBeOrdered(checked);
                    return (
                      <CartLineRow
                        key={index}
                        line={rowLine}
                        actionable
                        disabled={isSubmitting}
                        dimmed={
                          checked?.status === "soldOut" ||
                          checked?.status === "unavailable"
                        }
                        onEdit={() => setEditingIndex(index)}
                        onRemove={() => browserCart.removeLine(index)}
                        onQuantityChange={(next) =>
                          browserCart.setQuantity(index, next)
                        }
                        priceLabel={
                          <Typography
                            variant="body1"
                            sx={{
                              fontWeight: 700,
                              whiteSpace: "nowrap",
                              color: blocked ? "text.secondary" : "text.primary",
                              textDecoration: blocked ? "line-through" : "none",
                            }}
                          >
                            {formatAmount(
                              checked?.lineTotal ?? cartLineTotal(rowLine),
                            )}
                          </Typography>
                        }
                        status={
                          checked && (
                            <CartLineNotice
                              line={checked}
                              fitQuantity={fitQuantity(index)}
                              onChangeQuantity={(quantity) =>
                                browserCart.setQuantity(index, quantity)
                              }
                              onRemove={() => browserCart.removeLine(index)}
                              onEdit={() => setEditingIndex(index)}
                            />
                          )
                        }
                      />
                    );
                  })}
                </Stack>
              </Box>
            )}
          </Box>

          {isWaiting ? (
            <Box sx={{ pt: 1.5 }}>
              <CartButton status={status} disabled onClick={() => {}} />
            </Box>
          ) : (
            <Box sx={{ pt: 1.5 }}>
              <Divider sx={{ mb: 1.5 }} />
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Total Price
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {formatAmount(total)}
                </Typography>
              </Stack>
              {/* Always takes its line, so the note coming and going
                 never moves the buttons. */}
              <Typography
                variant="caption"
                color="text.secondary"
                role="status"
                aria-live="polite"
                sx={{ display: "block", minHeight: "1.66em", mb: 1 }}
              >
                {validation.checking ? "Checking latest prices…" : ""}
              </Typography>
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
                  {sendState === "needsScan" ? (
                    <Button
                      ref={scanButtonRef}
                      variant="contained"
                      fullWidth
                      startIcon={<PhotoCameraOutlinedIcon aria-hidden />}
                      onClick={requestScan}
                      sx={{ minHeight: 44, whiteSpace: "nowrap" }}
                    >
                      Scan counter QR
                    </Button>
                  ) : (
                    <CartButton
                      status="CART"
                      submitLabel="Send order"
                      disabled={
                        isSubmitting ||
                        sendDisabledReason !== null ||
                        !cart.clientRequestId
                      }
                      onClick={handleSubmit}
                    />
                  )}
                </Box>
              </Stack>
              {(sendState === "needsScan" || sendDisabledReason) && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", mt: 1 }}
                >
                  {sendState === "needsScan"
                    ? "Scan the QR code at the counter to send your order."
                    : sendDisabledReason}
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {scannerOpen && <CounterQrScannerDialog onClose={closeScanner} />}

      <MenuDetailDialog
        open={editingLine !== null}
        menuId={editingLine?.menuId ?? null}
        locationId={locationId}
        canOrder
        onClose={() => setEditingIndex(null)}
        editing={
          editingLine
            ? {
                quantity: editingLine.quantity,
                addonIds: editingLine.addonIds,
                note: editingLine.note ?? undefined,
              }
            : undefined
        }
        onSubmit={async (_menuId, quantity, addonIds, note, detail) => {
          if (editingIndex === null) return "Nothing to update.";
          browserCart.updateLine(
            editingIndex,
            toBrowserCartLine(detail, quantity, addonIds, note),
          );
          return null;
        }}
      />
    </Box>
  );
}
