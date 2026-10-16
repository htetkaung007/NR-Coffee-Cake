"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Snackbar,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { alpha, keyframes, useTheme } from "@mui/material/styles";
import { cartLinesTotal, sumQuantities } from "@/app/lib/order/orderTotals";
import { countLabel, formatAmount } from "@/app/lib/orderFormat";
import {
  quantityThatFits,
  toBrowserCartLine,
  toServerLines,
} from "@/app/lib/cart/browserCart";
import { asBrowserCart, isSendUnconfirmed } from "@/app/lib/cart/staffCart";
import type { ValidatedCartLine } from "@/app/lib/cart/cartValidation";
import { useStaffCart } from "@/app/lib/hooks/useStaffCart";
import { useAutoRefresh } from "@/app/lib/hooks/useAutoRefresh";
import {
  COUNTER_NEW_TARGET,
  resolveTarget,
  targetFromLink,
  targetKey,
  type OrderTarget,
  type TargetOptions,
} from "@/app/lib/order/orderTarget";
import { useCartValidation } from "@/app/lib/hooks/useCartValidation";
import MenuDetailDialog, {
  type MenuDetailEditingSelection,
} from "@/app/components/orderUI/MenuDetailDialog";
import CartLineNotice from "@/app/components/orderUI/CartLineNotice";
import OrderBottomBar from "../OrderBottomBar";
import SidePanelDrawer from "@/app/components/SidePanelDrawer";
import OrderSidePanel from "../OrderSidePanel";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import SegmentedTabs from "@/app/components/SegmentedTabs";
import {
  modeOfTarget,
  openBillCount,
  type ModeSource,
  type TargetMode,
} from "@/app/lib/order/targetMode";
import { moneySx } from "../orderTypography";
import {
  getStaffMenuDetailAction,
  getStaffSubmitStatusAction,
  getTableOccupancyAction,
  submitStaffOrderAction,
  validateStaffCartAction,
} from "./action";
import StaffMenuGrid, { type StaffCategory, type StaffMenu } from "./StaffMenuGrid";
import NameLanguageToggle from "@/app/components/NameLanguageToggle";
import {
  OrderUiLabelsProvider,
  useOrderUiLabels,
} from "@/app/components/orderUI/OrderUiLabels";
import { myanmarWordsOrNull } from "@/app/lib/i18n/customerWords";
import { useStaffMenuLanguage } from "@/app/lib/hooks/useStaffMenuLanguage";
import StaffOrderPanel, {
  type SendCheck,
  type StaffCartLine,
} from "./StaffOrderPanel";
import OrderTargetPicker, {
  targetName,
  type PickerOccupancy,
  type StaffTable,
} from "./OrderTargetPicker";

/** The bottom bar's one-time "item added" highlight (DESIGN.md Rules
 *  2–3, 25): a tinted overlay fading out once — opacity only, no loop.
 *  With reduced motion the global rule makes it instant; the count and
 *  total changing are the static cue. */
const ADDED_HIGHLIGHT_MS = 500;
const addedHighlightFade = keyframes`
  from { opacity: 1; }
  to { opacity: 0; }
`;

interface StaffOrderClientProps {
  locationId: number | null;
  /** The signed-in staff member — the cart is kept per user. */
  userId: number;
  tables: StaffTable[];
  /** In use / Free per table and the open Counter bills, as the server
   *  last rendered them. */
  occupancy: PickerOccupancy;
  /** ?for=<entry key> — opened from an order's "Add items" (read once). */
  initialFor: string | null;
  menus: StaffMenu[];
  /** Tabs after "All", in the server's order — never re-sorted. */
  categories: StaffCategory[];
}

/** A line the latest check says can still be sent ("ok", or a new price
 *  now shown). Not checked yet counts as sendable — the server checks
 *  again on send. */
const canBeSent = (line: ValidatedCartLine | undefined) =>
  !line || line.status === "ok" || line.status === "priceChanged";


export default function StaffOrderClient({
  locationId,
  userId,
  tables,
  occupancy: renderedOccupancy,
  initialFor,
  menus,
  categories,
}: StaffOrderClientProps) {
  const router = useRouter();
  const theme = useTheme();
  // The menu side's EN | မြန်မာ (this device's choice; null until read).
  // Display only — the stored cart and the order sent never change.
  const [menuLanguage, setMenuLanguage] = useStaffMenuLanguage();
  const englishDetailLabels = useOrderUiLabels();
  const detailLabels =
    myanmarWordsOrNull(menuLanguage)?.orderUi ?? englishDetailLabels;
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  // Tables' In use / Free: re-rendered by the server on the Order List's
  // auto-refresh cadence, and re-read when the picker opens — whichever
  // came last is shown.
  useAutoRefresh();
  const [occupancy, setOccupancy] = useState(renderedOccupancy);
  const [lastRendered, setLastRendered] = useState(renderedOccupancy);
  if (renderedOccupancy !== lastRendered) {
    setLastRendered(renderedOccupancy);
    setOccupancy(renderedOccupancy);
  }
  async function refreshOccupancy() {
    try {
      const result = await getTableOccupancyAction();
      if (result.success) setOccupancy(result.data);
    } catch {
      // Offline — the last known state stays; the auto-refresh retries.
    }
  }

  // What can be ordered for right now — a new takeaway (when there's a
  // counter), the open Counter bills, the tables.
  const targetOptions: TargetOptions = {
    hasCounter: tables.some((table) => table.isCounter),
    tableIds: tables.filter((table) => !table.isCounter).map((table) => table.id),
    openBillRootIds: occupancy.counterBills.map((bill) => bill.billRootId),
  };
  // A new takeaway is who a fresh order is for.
  const defaultTarget = targetOptions.hasCounter ? COUNTER_NEW_TARGET : null;
  const staffCart = useStaffCart(locationId ?? 0, userId, defaultTarget);
  const { cart } = staffCart;
  const browserCart = useMemo(() => asBrowserCart(cart), [cart]);
  const validation = useCartValidation(
    (lines) => validateStaffCartAction({ lines }),
    browserCart,
    staffCart.applyValidation,
    "canSend",
  );

  const [error, setError] = useState<string | null>(null);
  const [tablePrompt, setTablePrompt] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState<{
    message: string;
    /** The order to open from the notice (an order found by the status
     *  check); null for a plain "sent". */
    entryKey: string | null;
  } | null>(null);
  // The "did it go through?" check of an unconfirmed send; null when
  // there's none (or it's in flight as the send itself — isSending).
  const [sendCheck, setSendCheck] = useState<SendCheck | null>(null);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  // A switch waiting for "Switch and clear" (the order has items).
  // A target change waiting for "Switch and clear" (the order has items)
  // — to another target, or to none (the other "Order for" mode).
  const [pendingSwitch, setPendingSwitch] = useState<{
    next: OrderTarget | null;
  } | null>(null);
  // Opened from an order's "Add items" (?for=<entry key>): that order if
  // it can still be ordered for — or a new takeaway, with a short notice
  // — worked out once, from the server's own list of what's open.
  const [fromLink] = useState(() => targetFromLink(initialFor, targetOptions));
  const [linkNotice, setLinkNotice] = useState(fromLink?.notice ?? null);
  // Bumped when an item is added while the sheet is closed — replays the
  // bar's one-time highlight (0: never shown).
  const [addedPulse, setAddedPulse] = useState(0);
  const [dialog, setDialog] = useState<{
    menuId: number;
    /** Editing this line (its position); absent when adding. */
    lineIndex?: number;
    editing?: MenuDetailEditingSelection;
  } | null>(null);

  const pickerRef = useRef<HTMLDivElement>(null);

  // A stored target that can't be ordered for any more (a table gone, a
  // bill paid meanwhile) counts as none picked.
  const target = resolveTarget(cart.target, targetOptions);

  // "Order for" is split in two (lib/order/targetMode): New order (a new
  // takeaway, free tables) | Add to open bill (open Counter bills, tables
  // in use). The toggle shows the selected target's mode — so a table
  // that becomes in use while selected moves it, instead of being
  // dropped — and, with nothing selected, the mode last chosen.
  const modeSource: ModeSource = {
    hasCounter: targetOptions.hasCounter,
    tables: occupancy.tables.map((entry) => ({
      id: entry.tableId,
      status: entry.status,
    })),
    counterBillRootIds: targetOptions.openBillRootIds,
  };
  const [chosenMode, setChosenMode] = useState<TargetMode>(() =>
    fromLink?.target ? modeOfTarget(fromLink.target, modeSource) : "new",
  );
  const mode = target ? modeOfTarget(target, modeSource) : chosenMode;
  const openCount = openBillCount(modeSource);
  const noOpenBillsId = useId();

  const nameOf = (of: OrderTarget | null) =>
    of ? targetName(of, tables, occupancy.counterBills) : null;
  const currentTarget = nameOf(target);

  // Once the stored cart is known: preselect the link's target (asking
  // first if the cart holds another order's items) and drop the param
  // from the address. Sending onto it goes back to that order
  // (returnToEntry).
  const returnToEntry = useRef(false);

  // A send is out or unanswered: lines and target are locked until it's
  // settled (the store refuses changes too — this only says why).
  const isLocked = isSendUnconfirmed(cart);
  const lockedMessage = "Wait until we know whether the order went through.";

  const checkedLines = validation.result?.lines ?? [];
  const lines: StaffCartLine[] = cart.lines.map((line, index) => {
    const checked = checkedLines[index];
    return {
      index,
      menuId: line.menuId,
      menuName: line.display.name,
      menuNameMy: line.display.nameMy ?? null,
      quantity: line.quantity,
      price: line.display.unitPrice,
      addons: line.display.addons,
      note: line.note,
      blocked: !canBeSent(checked),
      // Its fix-it actions change the line — not while it's locked.
      notice: checked && !isLocked ? (
        <CartLineNotice
          line={checked}
          fitQuantity={quantityThatFits(
            cart.lines,
            index,
            checked.availableQuantity ?? 0,
          )}
          onChangeQuantity={(quantity) =>
            staffCart.setQuantity(index, quantity)
          }
          onRemove={() => staffCart.removeLine(index)}
          onEdit={() => handleEdit(index)}
        />
      ) : null,
    };
  });

  // The server's total (sendable lines at current prices) once checked;
  // until then, the prices last shown.
  const total = validation.result?.total ?? cartLinesTotal(lines);
  const itemCount = sumQuantities(lines);

  /** A menu was tapped with nothing picked: bring the "Order for"
   *  picker into view and focus it — on every size (it's never inside
   *  the sheet). */
  function promptForTable() {
    setTablePrompt(true);
    const picker = pickerRef.current;
    if (!picker) return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    picker.scrollIntoView({
      block: "center",
      behavior: reduceMotion ? "auto" : "smooth",
    });
    picker
      .querySelector<HTMLElement>("[role=combobox]")
      ?.focus({ preventScroll: true });
  }

  /** The bar's highlight, only when the sheet isn't showing the add. */
  function signalAdded() {
    if (!isOrderOpen) setAddedPulse((count) => count + 1);
  }

  /** The picker's change: with items in the order, ask first (switching
   *  clears it); the field keeps showing the old target until confirmed. */
  function requestTargetChange(next: OrderTarget | null) {
    const keyOf = (of: OrderTarget | null) => (of ? targetKey(of) : null);
    if (keyOf(next) === keyOf(target)) return;
    if (isLocked) return setError(lockedMessage);
    if (lines.length > 0) setPendingSwitch({ next });
    else handleTargetChange(next);
  }

  // (The link's preselect — see returnToEntry above. After
  // requestTargetChange, which it calls through a ref.)
  const latestRequest = useRef<(next: OrderTarget) => void>(() => {});
  useEffect(() => {
    latestRequest.current = requestTargetChange;
  });
  const handledLink = useRef(false);
  useEffect(() => {
    if (handledLink.current || !staffCart.isLoaded || !fromLink) return;
    handledLink.current = true;
    router.replace("/backoffice/order/new", { scroll: false });
    if (fromLink.target) {
      returnToEntry.current = fromLink.target.kind !== "counterNew";
      latestRequest.current(fromLink.target);
    }
  }, [staffCart.isLoaded, fromLink, router]);

  /** Picking who it's for starts a new order — in this browser only;
   *  nothing is written until Send. */
  function handleTargetChange(next: OrderTarget | null) {
    setPendingSwitch(null);
    setError(null);
    setTablePrompt(false);
    staffCart.chooseTarget(next);
  }
  /** The toggle: the other mode keeps the selection only if it belongs
   *  there (it can't — a target has one mode — so it's cleared, asking
   *  first when the order has items). */
  function selectMode(next: TargetMode) {
    if (isLocked) return setError(lockedMessage);
    setChosenMode(next);
    if (target && modeOfTarget(target, modeSource) !== next) {
      requestTargetChange(null);
    }
  }

  /** A menu without add-on groups: one tap adds one. */
  function quickAdd(menu: StaffMenu) {
    setError(null);
    staffCart.addLine(
      toBrowserCartLine(
        {
          id: menu.id,
          name: menu.name,
          price: menu.price,
          imageUrl: menu.imageUrl,
          addonCategories: [],
        },
        1,
        [],
        "",
      ),
    );
    signalAdded();
  }

  function handleSelectMenu(menu: StaffMenu) {
    if (target === null) return promptForTable();
    if (isLocked) return setError(lockedMessage);
    if (menu.hasAddonGroups) setDialog({ menuId: menu.id });
    else quickAdd(menu);
  }

  /** MenuDetailDialog's Add / Save: the line as the dialog showed it
   *  (names, prices, add-ons) goes into the cart. Returns an error or
   *  null. */
  async function handleDialogSubmit(
    menuId: number,
    quantity: number,
    addonIds: number[],
    note: string,
    detail: Parameters<typeof toBrowserCartLine>[0],
  ): Promise<string | null> {
    if (target === null) return "Choose a table or Counter first.";
    if (isLocked) return lockedMessage;
    const line = toBrowserCartLine(detail, quantity, addonIds, note);
    const lineIndex = dialog?.lineIndex;
    if (lineIndex === undefined) {
      staffCart.addLine(line);
      signalAdded();
    } else {
      staffCart.updateLine(lineIndex, line);
    }
    return null;
  }

  function handleEdit(index: number) {
    const line = cart.lines[index];
    if (!line || isLocked) return;
    setDialog({
      menuId: line.menuId,
      lineIndex: index,
      editing: {
        quantity: line.quantity,
        addonIds: line.addonIds,
        note: line.note ?? undefined,
      },
    });
  }

  /** The order reached the kitchen (this send, or an earlier one the
   *  status check found): clear it and say so. Onto an existing Counter
   *  bill (or from an order's "Add items"): back to that order, so the
   *  cashier sees the new round on its bill. */
  function handleSent(
    order: { orderNumber: string; entryKey: string },
    how: "sent" | "found",
  ) {
    const backToEntry =
      target?.kind === "counterBill" || returnToEntry.current;
    returnToEntry.current = false;
    staffCart.finishSend();
    setSendCheck(null);
    setError(null);
    setSent(
      how === "sent"
        ? { message: `Order ${order.orderNumber} sent to the kitchen`, entryKey: null }
        : {
            message: `Order ${order.orderNumber} was already sent`,
            entryKey: order.entryKey,
          },
    );
    setIsOrderOpen(false);
    if (backToEntry) router.push(`/backoffice/order/${order.entryKey}`);
  }

  /** A send's answer never arrived: ask whether an order exists under its
   *  request id. Found → it was sent; not found → nothing was written,
   *  so the order unlocks. If the check itself fails, the order stays
   *  locked with a Retry. */
  async function checkSendStatus(clientRequestId: string) {
    setSendCheck({ state: "checking" });
    let response;
    try {
      response = await getStaffSubmitStatusAction(clientRequestId);
    } catch {
      setSendCheck({
        state: "failed",
        message: "Couldn't reach the server to check whether the order went through.",
      });
      return;
    }
    if (!response.success) {
      setSendCheck({ state: "failed", message: response.error.message });
      return;
    }
    if (response.data.status === "sent") {
      handleSent(response.data, "found");
      return;
    }
    staffCart.abandonSend();
    setSendCheck(null);
    setError(
      "The order wasn't sent. Check it, then send again.",
    );
  }

  // A stored order that was mid-send when the page closed or reloaded:
  // find out once whether it went through.
  const checkedOnLoad = useRef(false);
  const latestCheck = useRef(checkSendStatus);
  useEffect(() => {
    latestCheck.current = checkSendStatus;
  });
  useEffect(() => {
    if (checkedOnLoad.current || !staffCart.isLoaded) return;
    checkedOnLoad.current = true;
    if (cart.pendingRequestId) void latestCheck.current(cart.pendingRequestId);
  }, [staffCart.isLoaded, cart.pendingRequestId]);

  /** "Send to kitchen": the whole order, once. The request id is made on
   *  the first press and kept (in the stored cart, which is locked
   *  meanwhile) until the send is settled — so a second click returns
   *  the same order instead of making another, and edited lines never go
   *  out under an old id. */
  async function handleSend() {
    if (target === null || cart.lines.length === 0 || isSending || sendCheck) {
      return;
    }
    const clientRequestId = staffCart.beginSend();
    if (!clientRequestId) return;
    setIsSending(true);
    setError(null);
    let response;
    try {
      response = await submitStaffOrderAction({
        target,
        lines: toServerLines(browserCart),
        clientRequestId,
      });
    } catch {
      // No answer — it may or may not have reached the server.
      setIsSending(false);
      void checkSendStatus(clientRequestId);
      return;
    }
    setIsSending(false);
    if (!response.success) {
      if (response.error.code === "INTERNAL_ERROR") {
        // An unexpected server error — it may have failed after writing.
        void checkSendStatus(clientRequestId);
      } else {
        // A plain refusal (a closed bill, a table gone): nothing written.
        staffCart.abandonSend();
        setError(response.error.message);
      }
      return;
    }
    const result = response.data;
    if (result.status !== "submitted") {
      // Nothing was written: show what changed on the lines.
      staffCart.abandonSend();
      validation.showResult(result.validation);
      setError(
        result.status === "pricesChanged"
          ? "Prices have changed — check the order, then send again."
          : "Some items can't be sent as they are — see below.",
      );
      return;
    }
    handleSent(result, "sent");
  }

  const sendBlockedReason = isLocked && !isSending
    ? "Waiting to hear whether the order went through"
    : target === null
      ? "Choose a table or Counter first"
      : lines.length === 0
        ? "Add items to start an order"
        : lines.some((line) => line.blocked)
          ? "Fix the items marked below first"
          : null;

  if (locationId === null) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">
          You aren&apos;t assigned to a location yet — contact an Admin.
        </Alert>
      </Box>
    );
  }

  const renderPanel = (inDrawer: boolean) => (
    <StaffOrderPanel
      // In the sheet the picker is out of sight, so the header says
      // whom the order is for.
      title={
        inDrawer && currentTarget
          ? `Current order — ${currentTarget}`
          : "Current order"
      }
      lines={lines}
      total={total}
      onEdit={(line) => handleEdit(line.index)}
      onChangeQuantity={(line, next) => staffCart.setQuantity(line.index, next)}
      onRemove={(line) => staffCart.removeLine(line.index)}
      error={error}
      onDismissError={() => setError(null)}
      sendBlockedReason={sendBlockedReason}
      isSending={isSending}
      onSend={() => void handleSend()}
      locked={isLocked}
      sendCheck={sendCheck}
      onRetryCheck={() => {
        if (cart.pendingRequestId) void checkSendStatus(cart.pendingRequestId);
      }}
      onClose={inDrawer ? () => setIsOrderOpen(false) : undefined}
      language={menuLanguage ?? "en"}
    />
  );

  // ONE picker, placed by width: its own card above Current order from
  // lg, above the search and menus below lg.
  const picker = (
    <>
      <SegmentedTabs
        ariaLabel="Order for"
        value={mode}
        onSelect={selectMode}
        items={[
          { value: "new", label: "New order" },
          {
            value: "open",
            label: "Add to open bill",
            count: openCount,
            disabled: openCount === 0,
            describedBy: openCount === 0 ? noOpenBillsId : undefined,
          },
        ]}
        sx={{ width: "100%", mb: openCount === 0 ? 0.5 : 1.5 }}
      />
      {openCount === 0 && (
        <Typography
          id={noOpenBillsId}
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1.5 }}
        >
          No open bills
        </Typography>
      )}
      <OrderTargetPicker
        tables={tables}
        occupancy={occupancy}
        mode={mode}
        target={target}
        onChange={requestTargetChange}
        onOpen={() => void refreshOccupancy()}
        prompt={tablePrompt}
        pickerRef={pickerRef}
      />
      {linkNotice && (
        <Alert
          severity="info"
          role="status"
          onClose={() => setLinkNotice(null)}
          sx={{ mt: 1 }}
        >
          {linkNotice}
        </Alert>
      )}
    </>
  );
  const pendingSwitchName = pendingSwitch
    ? (nameOf(pendingSwitch.next) ??
      (mode === "new" ? "Add to open bill" : "New order"))
    : null;

  return (
    <Box sx={{ px: { xs: 0, sm: 2, lg: 3 }, pt: { xs: 1.5, sm: 2, lg: 3 } }}>
      <Stack direction="row" useFlexGap sx={{ gap: 3, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0, pb: { lg: 3 } }}>
          {/* The title, and the menu side's EN | မြန်မာ on its right —
             in sight on every size. */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Typography component="h1" variant="h6">
              New Order
            </Typography>
            <NameLanguageToggle
              value={menuLanguage ?? "en"}
              onChange={setMenuLanguage}
              ariaLabel="Menu language"
            />
          </Stack>
          {!isDesktop && <Box sx={{ mb: 2 }}>{picker}</Box>}
          <StaffMenuGrid
            menus={menus}
            categories={categories}
            language={menuLanguage}
            onSelect={handleSelectMenu}
          />
        </Box>

        <OrderSidePanel
          label="Current order"
          showFrom="lg"
          width={400}
          fullHeight
          above={isDesktop ? picker : undefined}
        >
          {renderPanel(false)}
        </OrderSidePanel>
      </Stack>

      <OrderBottomBar
        hideFrom="lg"
        actionLabel="View order"
        onAction={() => setIsOrderOpen(true)}
      >
        {/* "Table 3 · 2 items · 8,997 MMK" — wraps rather than truncates
           (money is never cut off). Re-mounted per add to replay the
           one-time highlight. */}
        <Box
          key={addedPulse}
          sx={
            addedPulse > 0
              ? {
                  position: "relative",
                  borderRadius: 1,
                  "&::after": {
                    content: '""',
                    position: "absolute",
                    inset: 0,
                    pointerEvents: "none",
                    borderRadius: "inherit",
                    backgroundColor: alpha(theme.palette.primary.main, 0.16),
                    opacity: 0,
                    animation: `${addedHighlightFade} ${ADDED_HIGHLIGHT_MS}ms ease-out`,
                  },
                }
              : undefined
          }
        >
          <Typography variant="body2" sx={{ color: "text.primary" }}>
            {currentTarget && <>{currentTarget} · </>}
            {itemCount === 0 ? (
              "No items yet"
            ) : (
              <>
                {countLabel(itemCount, "item", "items")} ·{" "}
                <Box
                  component="span"
                  sx={{ ...moneySx, whiteSpace: "nowrap" }}
                >
                  {formatAmount(total)}
                </Box>
              </>
            )}
          </Typography>
        </Box>
      </OrderBottomBar>

      <SidePanelDrawer
        label={currentTarget ? `Current order — ${currentTarget}` : "Current order"}
        placement="sheet"
        // Never over the side panel if the window widens while it's open.
        open={isOrderOpen && !isDesktop}
        onClose={() => setIsOrderOpen(false)}
      >
        {renderPanel(true)}
      </SidePanelDrawer>

      <ConfirmDialog
        open={pendingSwitch !== null}
        title={`Switch to ${pendingSwitchName ?? "another order"}?`}
        message={`The current order (${countLabel(itemCount, "item", "items")}) will be cleared.`}
        confirmLabel="Switch and clear"
        destructive
        onConfirm={() => {
          if (pendingSwitch !== null) handleTargetChange(pendingSwitch.next);
        }}
        onCancel={() => setPendingSwitch(null)}
      />

      {/* The detail sheet in the menu side's language: its names and
         its own words (quantity, note, Required, Add) — the customer's,
         from the shared OrderUiLabels — or the Backoffice's English. */}
      <OrderUiLabelsProvider value={detailLabels}>
        <MenuDetailDialog
          open={dialog !== null}
          menuId={dialog?.menuId ?? null}
          locationId={locationId}
          canOrder={target !== null}
          editing={dialog?.editing}
          onClose={() => setDialog(null)}
          onSubmit={handleDialogSubmit}
          loadDetail={getStaffMenuDetailAction}
        />
      </OrderUiLabelsProvider>

      <Snackbar
        open={sent !== null}
        autoHideDuration={sent?.entryKey ? 8000 : 4000}
        onClose={() => setSent(null)}
        message={sent?.message}
        action={
          sent?.entryKey ? (
            <Button
              color="inherit"
              size="small"
              sx={{ minHeight: 44 }}
              onClick={() => {
                const entryKey = sent.entryKey;
                setSent(null);
                router.push(`/backoffice/order/${entryKey}`);
              }}
            >
              View order
            </Button>
          ) : undefined
        }
        anchorOrigin={
          isDesktop
            ? { vertical: "bottom", horizontal: "left" }
            : { vertical: "top", horizontal: "center" }
        }
      />
    </Box>
  );
}
