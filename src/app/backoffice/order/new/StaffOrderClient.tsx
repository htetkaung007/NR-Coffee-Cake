"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
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
import { asBrowserCart } from "@/app/lib/cart/staffCart";
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
  getTableOccupancyAction,
  submitStaffOrderAction,
  validateStaffCartAction,
} from "./action";
import StaffMenuGrid, { type StaffCategory, type StaffMenu } from "./StaffMenuGrid";
import StaffOrderPanel, { type StaffCartLine } from "./StaffOrderPanel";
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

/**
 * POS-style New Order page: the menu on the left; from lg the "Order for"
 * picker and the current order as two cards on the right, always in
 * view. Below lg the picker sits above the menus and the current order
 * opens as a bottom sheet from a bottom bar (on phones AND tablets — the
 * side is where the navigation drawer comes from). The same
 * OrderSidePanel / OrderBottomBar / SidePanelDrawer pieces as the order
 * detail page's bill.
 *
 * The order stays on this device until Send: it's kept in this browser
 * (useStaffCart — per location and user, today's only), so picking a
 * table writes nothing (the customers' phones at that table are never
 * touched) and a refresh doesn't lose it. While it has lines it's checked
 * against the server (useCartValidation → validateStaffCartAction) so
 * "Only 1 left" / "Sold out" / "No longer available" show before
 * sending. "Send to kitchen" sends the whole order once, with a request
 * id kept until it succeeds — a retry or a double click can't make two
 * orders.
 *
 * The picker is ONE instance, placed by width (isDesktop). Switching
 * table clears the current order, so with items in it the switch asks
 * first (ConfirmDialog).
 */
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
  const [sentMessage, setSentMessage] = useState<string | null>(null);
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

  const checkedLines = validation.result?.lines ?? [];
  const lines: StaffCartLine[] = cart.lines.map((line, index) => {
    const checked = checkedLines[index];
    return {
      index,
      menuId: line.menuId,
      menuName: line.display.name,
      quantity: line.quantity,
      price: line.display.unitPrice,
      addons: line.display.addons,
      note: line.note,
      blocked: !canBeSent(checked),
      notice: checked ? (
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
    if (lines.length > 0) setPendingSwitch({ next });
    else handleTargetChange(next);
  }

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
    if (!line) return;
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

  /** "Send to kitchen": the whole order, once. The request id is made on
   *  the first press and kept (in the stored cart) until a send
   *  succeeds — so a retry after a dropped connection, or a second
   *  click, returns the same order instead of making another. */
  async function handleSend() {
    if (target === null || cart.lines.length === 0 || isSending) return;
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
      setIsSending(false);
      setError(
        "Couldn't reach the server. Try again — the order won't be sent twice.",
      );
      return;
    }
    setIsSending(false);
    if (!response.success) {
      setError(response.error.message);
      return;
    }
    const result = response.data;
    if (result.status !== "submitted") {
      // Nothing was written: show what changed on the lines.
      validation.showResult(result.validation);
      setError(
        result.status === "pricesChanged"
          ? "Prices have changed — check the order, then send again."
          : "Some items can't be sent as they are — see below.",
      );
      return;
    }
    // Onto an existing Counter bill (or from an order's "Add items"):
    // back to that order, so the cashier sees the new round on its bill.
    const backToEntry =
      target.kind === "counterBill" || returnToEntry.current;
    returnToEntry.current = false;
    staffCart.finishSend();
    setSentMessage(`Order ${result.orderNumber} sent to the kitchen`);
    setIsOrderOpen(false);
    if (backToEntry) router.push(`/backoffice/order/${result.entryKey}`);
  }

  const sendBlockedReason =
    target === null
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
      onClose={inDrawer ? () => setIsOrderOpen(false) : undefined}
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
          <Typography component="h1" variant="h6" sx={{ mb: 2 }}>
            New Order
          </Typography>
          {!isDesktop && <Box sx={{ mb: 2 }}>{picker}</Box>}
          <StaffMenuGrid
            menus={menus}
            categories={categories}
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

      <MenuDetailDialog
        open={dialog !== null}
        menuId={dialog?.menuId ?? null}
        locationId={locationId}
        canOrder={target !== null}
        editing={dialog?.editing}
        onClose={() => setDialog(null)}
        onSubmit={handleDialogSubmit}
      />

      <Snackbar
        open={sentMessage !== null}
        autoHideDuration={4000}
        onClose={() => setSentMessage(null)}
        message={sentMessage}
        anchorOrigin={
          isDesktop
            ? { vertical: "bottom", horizontal: "left" }
            : { vertical: "top", horizontal: "center" }
        }
      />
    </Box>
  );
}
