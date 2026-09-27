"use client";

import { useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Snackbar,
  Stack,
  Typography,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { applyAddedLine, cartLinesTotal, sumQuantities } from "@/app/lib/orderTotals";
import { countLabel, formatAmount } from "@/app/lib/orderFormat";
import { toLineAddons } from "@/app/lib/roundLine";
import MenuDetailDialog, {
  type MenuDetailEditingSelection,
} from "@/app/components/orderUI/MenuDetailDialog";
import OrderBottomBar from "../OrderBottomBar";
import OrderPanelDrawer from "../OrderPanelDrawer";
import OrderSidePanel from "../OrderSidePanel";
import { moneySx } from "../orderTypography";
import {
  addStaffCartItemAction,
  removeStaffCartItemAction,
  startStaffOrderAction,
  submitStaffOrderAction,
  updateStaffCartItemAction,
} from "./action";
import StaffMenuGrid, { type StaffCategory, type StaffMenu } from "./StaffMenuGrid";
import StaffOrderPanel, {
  type StaffCartLine,
  type StaffTable,
} from "./StaffOrderPanel";

interface StaffOrderClientProps {
  locationId: number | null;
  tables: StaffTable[];
  menus: StaffMenu[];
  /** Tabs after "All", in the server's order — never re-sorted. */
  categories: StaffCategory[];
}

/** A saved line as the add / update actions return it. */
interface SavedLine {
  id: number;
  menuId: number;
  quantity: number;
  unitPrice: number;
  note: string | null;
  OrdersAddons: { addonId: number; unitPrice: number; addon: { name: string } }[];
}

type Line = Omit<StaffCartLine, "isBusy">;

/** A quick add (no add-ons, no note) merges into this line on the
 *  server — the shared line-merge rule — so it's where a pending quick
 *  add is shown while the request is in flight. */
function isPlainLine(line: Line, menuId: number) {
  return line.menuId === menuId && line.addons.length === 0 && !line.note;
}

/**
 * POS-style New Order page: the menu on the left, the current order
 * always in view on the right from md up (a bottom bar + drawer / sheet
 * below md — the same OrderSidePanel / OrderBottomBar / OrderPanelDrawer
 * pieces as the order detail page's bill).
 *
 * Sessions: picking a table starts a staff session right away (as
 * before). After "Send to kitchen" the table stays picked, and the next
 * session starts with the next add — starting one straight away would
 * point the table's active round at an empty cart.
 *
 * Every add reuses MenuDetailDialog for menus with add-on groups; a menu
 * without any is added with one tap, optimistically (pendingAdds).
 */
export default function StaffOrderClient({
  locationId,
  tables,
  menus,
  categories,
}: StaffOrderClientProps) {
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up("md"));

  // Counter (takeaway) is picked when the page opens; its session starts
  // with the first add (see ensureSession), like after a send.
  const [tableId, setTableId] = useState<number | "">(
    () => tables.find((table) => table.isCounter)?.id ?? "",
  );
  const [cart, setCart] = useState<Line[]>([]);
  // Quick adds still in flight, per menu id — shown right away.
  const [pendingAdds, setPendingAdds] = useState<Record<number, number>>({});
  const [busyLineIds, setBusyLineIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [tablePrompt, setTablePrompt] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [isOrderOpen, setIsOrderOpen] = useState(false);
  const [dialog, setDialog] = useState<{
    menuId: number;
    lineId?: number;
    editing?: MenuDetailEditingSelection;
  } | null>(null);

  const menuById = useMemo(
    () => new Map(menus.map((menu) => [menu.id, menu])),
    [menus],
  );
  const pickerRef = useRef<HTMLDivElement>(null);

  // The current staff session — a ref, so async flows started before a
  // re-render (e.g. two quick taps) share it instead of racing.
  const sessionIdRef = useRef<number | null>(null);
  const sessionStart = useRef<{
    tableId: number;
    promise: Promise<number | null>;
  } | null>(null);

  /** The session to add to — started now if there isn't one yet (the
   *  first add after a send). Null when it couldn't be started. */
  function ensureSession(forTableId: number): Promise<number | null> {
    if (sessionIdRef.current !== null) {
      return Promise.resolve(sessionIdRef.current);
    }
    if (sessionStart.current?.tableId !== forTableId) {
      const promise = startStaffOrderAction(forTableId).then((result) => {
        // A different table was picked while this was starting.
        if (sessionStart.current?.tableId !== forTableId) return null;
        sessionStart.current = null;
        if (!result.success) {
          setError(result.error.message);
          return null;
        }
        sessionIdRef.current = result.data.id;
        return result.data.id;
      });
      sessionStart.current = { tableId: forTableId, promise };
    }
    return sessionStart.current.promise;
  }

  function toLine(saved: SavedLine): Line {
    return {
      id: saved.id,
      menuId: saved.menuId,
      menuName: menuById.get(saved.menuId)?.name ?? "Item",
      quantity: saved.quantity,
      // The server's own snapshot, not the (possibly stale) menu price.
      price: saved.unitPrice,
      addons: toLineAddons(saved.OrdersAddons),
      note: saved.note,
    };
  }

  function setBusy(lineId: number, busy: boolean) {
    setBusyLineIds((current) => {
      const next = new Set(current);
      if (busy) next.add(lineId);
      else next.delete(lineId);
      return next;
    });
  }

  function changePending(menuId: number, delta: number) {
    setPendingAdds((current) => ({
      ...current,
      [menuId]: Math.max(0, (current[menuId] ?? 0) + delta),
    }));
  }

  // What the panel shows: saved lines, plus quick adds still in flight —
  // on top of the line they'll merge into, or as a temporary line.
  const lines: StaffCartLine[] = useMemo(() => {
    const shown: StaffCartLine[] = cart.map((line) => ({
      ...line,
      isBusy: busyLineIds.has(line.id),
    }));
    for (const [key, count] of Object.entries(pendingAdds)) {
      if (count === 0) continue;
      const menuId = Number(key);
      const target = shown.find((line) => isPlainLine(line, menuId));
      if (target) {
        target.quantity += count;
        target.isBusy = true;
      } else {
        const menu = menuById.get(menuId);
        shown.push({
          id: -menuId,
          menuId,
          menuName: menu?.name ?? "Item",
          quantity: count,
          price: menu?.price ?? 0,
          addons: [],
          note: null,
          isBusy: true,
        });
      }
    }
    return shown;
  }, [cart, pendingAdds, busyLineIds, menuById]);

  const total = cartLinesTotal(lines);
  const itemCount = sumQuantities(lines);
  const isSaving =
    busyLineIds.size > 0 || Object.values(pendingAdds).some((count) => count > 0);

  function promptForTable() {
    setTablePrompt(true);
    if (isDesktop) {
      pickerRef.current?.querySelector<HTMLElement>("[role=combobox]")?.focus();
    } else {
      setIsOrderOpen(true);
    }
  }

  /** Same as before: picking a table clears the order and starts a new
   *  staff session for that table. */
  function handleTableChange(nextTableId: number) {
    setError(null);
    setTablePrompt(false);
    setTableId(nextTableId);
    setCart([]);
    setPendingAdds({});
    setBusyLineIds(new Set());
    sessionIdRef.current = null;
    sessionStart.current = null;
    void ensureSession(nextTableId);
  }

  async function quickAdd(menu: StaffMenu) {
    if (tableId === "") return promptForTable();
    setError(null);
    changePending(menu.id, 1);
    const sessionId = await ensureSession(tableId);
    if (sessionId === null) {
      changePending(menu.id, -1);
      return;
    }
    const result = await addStaffCartItemAction(sessionId, tableId, menu.id, 1);
    changePending(menu.id, -1);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    // Merged into an existing line, or a new one (see addItemToCart).
    setCart((current) => applyAddedLine(current, toLine(result.data)));
  }

  function handleSelectMenu(menu: StaffMenu) {
    if (menu.hasAddonGroups) {
      if (tableId === "") return promptForTable();
      setDialog({ menuId: menu.id });
    } else {
      void quickAdd(menu);
    }
  }

  /** MenuDetailDialog's Add / Save: returns an error message or null. */
  async function handleDialogSubmit(
    menuId: number,
    quantity: number,
    addonIds: number[],
    note: string,
  ): Promise<string | null> {
    if (tableId === "") return "Choose a table or Counter first.";
    const sessionId = await ensureSession(tableId);
    if (sessionId === null) return "Couldn't start the order. Try again.";

    const lineId = dialog?.lineId;
    const result =
      lineId === undefined
        ? await addStaffCartItemAction(
            sessionId,
            tableId,
            menuId,
            quantity,
            addonIds,
            note,
          )
        : await updateStaffCartItemAction(
            sessionId,
            lineId,
            quantity,
            addonIds,
            note,
          );
    if (!result.success) return result.error.message;

    const saved = toLine(result.data);
    setCart((current) =>
      lineId === undefined
        ? applyAddedLine(current, saved)
        : current.map((line) => (line.id === lineId ? saved : line)),
    );
    return null;
  }

  async function handleChangeQuantity(line: StaffCartLine, next: number) {
    const sessionId = sessionIdRef.current;
    if (sessionId === null || line.id < 0) return;
    setError(null);
    setBusy(line.id, true);
    setCart((current) =>
      current.map((item) =>
        item.id === line.id ? { ...item, quantity: next } : item,
      ),
    );
    const result = await updateStaffCartItemAction(
      sessionId,
      line.id,
      next,
      line.addons.map((addon) => addon.id),
      line.note ?? undefined,
    );
    setBusy(line.id, false);
    if (!result.success) {
      setCart((current) =>
        current.map((item) =>
          item.id === line.id ? { ...item, quantity: line.quantity } : item,
        ),
      );
      setError(result.error.message);
    }
  }

  async function handleRemove(line: StaffCartLine) {
    const sessionId = sessionIdRef.current;
    if (sessionId === null || line.id < 0) return;
    setError(null);
    const previous = cart;
    setCart((current) => current.filter((item) => item.id !== line.id));
    const result = await removeStaffCartItemAction(sessionId, line.id);
    if (!result.success) {
      setCart(previous);
      setError(result.error.message);
    }
  }

  function handleEdit(line: StaffCartLine) {
    if (line.id < 0) return;
    setDialog({
      menuId: line.menuId,
      lineId: line.id,
      editing: {
        quantity: line.quantity,
        addonIds: line.addons.map((addon) => addon.id),
        note: line.note ?? undefined,
      },
    });
  }

  async function handleSend() {
    const sessionId = sessionIdRef.current;
    if (sessionId === null) return;
    setIsSending(true);
    setError(null);
    const result = await submitStaffOrderAction(sessionId);
    setIsSending(false);
    if (!result.success) {
      setError(result.error.message);
      return;
    }
    setSentMessage(`Order ${result.data.orderNumber} sent to the kitchen`);
    setCart([]);
    // Keep the table picked for the next order; its session starts with
    // the next add (see ensureSession).
    sessionIdRef.current = null;
    setIsOrderOpen(false);
  }

  const sendBlockedReason =
    tableId === ""
      ? "Choose a table or Counter first"
      : lines.length === 0
        ? "Add items to start an order"
        : isSaving
          ? "Saving items…"
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
      tables={tables}
      tableId={tableId}
      onTableChange={handleTableChange}
      tablePrompt={tablePrompt}
      pickerRef={inDrawer ? undefined : pickerRef}
      autoFocusPicker={inDrawer && tablePrompt}
      lines={lines}
      total={total}
      onEdit={handleEdit}
      onChangeQuantity={(line, next) => void handleChangeQuantity(line, next)}
      onRemove={(line) => void handleRemove(line)}
      error={error}
      onDismissError={() => setError(null)}
      sendBlockedReason={sendBlockedReason}
      isSending={isSending}
      onSend={() => void handleSend()}
      onClose={inDrawer ? () => setIsOrderOpen(false) : undefined}
    />
  );

  return (
    <Box sx={{ px: { xs: 0, sm: 2, md: 3 }, pt: { xs: 1.5, sm: 2, md: 3 } }}>
      <Stack direction="row" useFlexGap sx={{ gap: 3, alignItems: "flex-start" }}>
        <Box sx={{ flex: 1, minWidth: 0, pb: { md: 3 } }}>
          <Typography component="h1" variant="h6" sx={{ mb: 2 }}>
            New Order
          </Typography>
          <StaffMenuGrid
            menus={menus}
            categories={categories}
            onSelect={handleSelectMenu}
          />
        </Box>

        <OrderSidePanel
          label="Current order"
          showFrom="md"
          width={{ md: 360, lg: 400 }}
          fullHeight
        >
          {renderPanel(false)}
        </OrderSidePanel>
      </Stack>

      <OrderBottomBar
        hideFrom="md"
        actionLabel="View order"
        onAction={() => setIsOrderOpen(true)}
      >
        {/* Two lines, never truncated — money is never cut off. */}
        <Typography variant="body2" color="text.secondary">
          {countLabel(itemCount, "item", "items")}
        </Typography>
        <Typography variant="body1" sx={{ ...moneySx, color: "text.primary" }}>
          {formatAmount(total)}
        </Typography>
      </OrderBottomBar>

      <OrderPanelDrawer
        label="Current order"
        // Never over the side panel if the window widens while it's open.
        open={isOrderOpen && !isDesktop}
        onClose={() => setIsOrderOpen(false)}
      >
        {renderPanel(true)}
      </OrderPanelDrawer>

      <MenuDetailDialog
        open={dialog !== null}
        menuId={dialog?.menuId ?? null}
        locationId={locationId}
        canOrder={tableId !== ""}
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
