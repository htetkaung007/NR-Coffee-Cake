"use client";

import { useId, type ReactNode, type Ref } from "react";
import { Box, ListSubheader, MenuItem, TextField, Typography } from "@mui/material";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import TableRestaurantOutlinedIcon from "@mui/icons-material/TableRestaurantOutlined";
import StorefrontOutlinedIcon from "@mui/icons-material/StorefrontOutlined";
import type {
  CounterBillOccupancy,
  TableOccupancy,
} from "@/app/lib/order/tableOccupancy";
import {
  parseTargetKey,
  targetKey,
  type OrderTarget,
} from "@/app/lib/order/orderTarget";
import { countLabel, formatAmount } from "@/app/lib/orderFormat";
import { optionsForMode, type TargetMode } from "@/app/lib/order/targetMode";

export interface StaffTable {
  id: number;
  name: string;
  isCounter: boolean;
}

/** What the picker knows about who can be ordered for (the occupancy
 *  read, OrderListService.getTableOccupancy). */
export interface PickerOccupancy {
  tables: readonly TableOccupancy[];
  counterBills: readonly CounterBillOccupancy[];
}

/** The short name an order summary uses: "Counter" (a new takeaway),
 *  "Counter #A012" (a round on that bill), or the table's name — "Table
 *  3 · 2 items", "Current order — Counter", "Switch to Table 3?". */
export function targetName(
  target: OrderTarget,
  tables: readonly StaffTable[],
  counterBills: readonly CounterBillOccupancy[],
): string | null {
  switch (target.kind) {
    case "counterNew":
      return "Counter";
    case "counterBill": {
      const bill = counterBills.find((b) => b.billRootId === target.billRootId);
      return bill ? `Counter ${bill.title}` : null;
    }
    case "table":
      return tables.find((table) => table.id === target.tableId)?.name ?? null;
  }
}

/** "Table 2" before "Table 10". */
const byName = (a: StaffTable, b: StaffTable) =>
  a.name.localeCompare(b.name, undefined, { numeric: true });

/** What an open bill or In use table adds after its status: "2 orders ·
 *  16,498 MMK · waiting approval", or — only a customer's unsent draft —
 *  "a customer is ordering". Money stays text, never coloured. */
function openDetail(entry: {
  openOrderCount: number;
  unpaidTotal: number;
  hasPendingApproval: boolean;
}) {
  if (entry.openOrderCount === 0) return "a customer is ordering";
  const parts = [countLabel(entry.openOrderCount, "order", "orders")];
  if (entry.unpaidTotal > 0) parts.push(formatAmount(entry.unpaidTotal));
  if (entry.hasPendingApproval) parts.push("waiting approval");
  return parts.join(" · ");
}

/** A table's occupancy: a 10px dot and the word, both in the status
 *  colour — In use the error role (dot error.main, word
 *  palette.errorText), Free the success role (dot success.main, word
 *  palette.successText); both words ≥ 4.5:1 on paper in light and dark.
 *  Only the dot and the word are coloured — never colour alone
 *  (DESIGN.md Rule 13). */
function OccupancyMark({ status }: { status: "inUse" | "free" }) {
  const isInUse = status === "inUse";
  return (
    <Box
      component="span"
      sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}
    >
      <Box
        component="span"
        aria-hidden
        sx={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          flexShrink: 0,
          bgcolor: isInUse ? "error.main" : "success.main",
        }}
      />
      <Typography
        component="span"
        variant="body2"
        sx={(theme) => ({
          color: isInUse ? theme.palette.errorText : theme.palette.successText,
        })}
      >
        {isInUse ? "In use" : "Free"}
      </Typography>
    </Box>
  );
}

/** One option: an icon, the name, then (optionally) a status mark and
 *  details in secondary text. */
function OptionRow({
  icon,
  name,
  status,
  detail,
}: {
  icon: ReactNode;
  name: string;
  status?: ReactNode;
  detail?: string;
}) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
      <Box
        aria-hidden
        sx={{ display: "flex", color: "text.secondary", flexShrink: 0 }}
      >
        {icon}
      </Box>
      <Typography
        variant="body1"
        component="span"
        sx={{
          minWidth: 0,
          whiteSpace: "normal",
          display: "inline-flex",
          flexWrap: "wrap",
          alignItems: "center",
          columnGap: 0.75,
        }}
      >
        {name}
        {status}
        {detail && (
          <Typography component="span" variant="body2" color="text.secondary">
            {status ? "· " : ""}
            {detail}
          </Typography>
        )}
      </Typography>
    </Box>
  );
}

/**
 * "Order for": who the New Order is for — the ONE picker on the page
 * (above the menus below lg, its own card above Current order from lg),
 * showing only the chosen MODE's options (lib/order/targetMode — the
 * New order / Add to open bill toggle above it):
 * - New order: "Counter · New takeaway", then the FREE tables (or a
 *   disabled "All tables are in use");
 * - Add to open bill: the open Counter bills, then the tables IN USE —
 *   a new round on one is paid with it.
 * Changing it is the parent's call (it may ask first when the order has
 * items); the field always shows `target`, so a cancelled switch keeps
 * the old value. Picking an open bill or an In use table says so under
 * the field.
 */
export default function OrderTargetPicker({
  tables,
  occupancy,
  mode,
  target,
  onChange,
  onOpen,
  prompt,
  pickerRef,
}: {
  tables: StaffTable[];
  occupancy: PickerOccupancy;
  mode: TargetMode;
  target: OrderTarget | null;
  onChange: (target: OrderTarget) => void;
  /** The list is opening — a moment to refresh `occupancy`. */
  onOpen?: () => void;
  /** Shown under the field when an add was tried with nothing chosen. */
  prompt: boolean;
  /** The field's root — the page scrolls it into view and focuses it. */
  pickerRef?: Ref<HTMLDivElement>;
}) {
  const helperId = useId();
  const tableOccupancy = new Map(
    occupancy.tables.map((entry) => [entry.tableId, entry]),
  );
  const seatTables = tables.filter((table) => !table.isCounter).sort(byName);
  const options = optionsForMode(mode, {
    hasCounter: tables.some((table) => table.isCounter),
    tables: seatTables.map((table) => ({
      id: table.id,
      status: tableOccupancy.get(table.id)?.status ?? "free",
    })),
    counterBillRootIds: occupancy.counterBills.map((bill) => bill.billRootId),
  });
  const listedTables = seatTables.filter((table) =>
    options.tableIds.includes(table.id),
  );
  const listedBills = occupancy.counterBills.filter((bill) =>
    options.counterBillRootIds.includes(bill.billRootId),
  );

  const name = target
    ? targetName(target, tables, occupancy.counterBills)
    : null;
  // An existing bill: an open Counter bill, or an In use table's tab.
  const existing =
    target?.kind === "counterBill"
      ? occupancy.counterBills.find((b) => b.billRootId === target.billRootId)
      : target?.kind === "table" &&
          tableOccupancy.get(target.tableId)?.status === "inUse"
        ? tableOccupancy.get(target.tableId)
        : undefined;
  const helperText = prompt
    ? "Choose a table or Counter first"
    : existing && name
      ? `Adds a new order to ${name}'s bill${
          existing.unpaidTotal > 0
            ? ` (${formatAmount(existing.unpaidTotal)} so far)`
            : ""
        }`
      : undefined;

  return (
    <TextField
      select
      fullWidth
      label="Order for"
      value={target ? targetKey(target) : ""}
      ref={pickerRef}
      onChange={(event) => {
        const next = parseTargetKey(event.target.value);
        if (next) onChange(next);
      }}
      error={prompt}
      helperText={helperText}
      slotProps={{
        formHelperText: { id: helperId },
        select: {
          "aria-describedby": helperText ? helperId : undefined,
          onOpen,
          // The field itself shows just the name; the list has the state.
          renderValue: (value) => {
            const chosen = parseTargetKey(String(value));
            if (!chosen) return "";
            if (chosen.kind === "counterNew") return "Counter · New takeaway";
            return targetName(chosen, tables, occupancy.counterBills) ?? "";
          },
        },
      }}
    >
      {options.counterNew && (
        <MenuItem value="counter-new" sx={{ minHeight: 44 }}>
          <OptionRow
            icon={<StorefrontOutlinedIcon fontSize="small" />}
            name="Counter"
            detail="New takeaway"
          />
        </MenuItem>
      )}
      {listedBills.length > 0 && <ListSubheader>Counter bills</ListSubheader>}
      {listedBills.map((bill) => (
        // No occupancy colour on a bill — its receipt icon says what it is.
        <MenuItem
          key={bill.billRootId}
          value={targetKey({ kind: "counterBill", billRootId: bill.billRootId })}
          sx={{ minHeight: 44 }}
        >
          <OptionRow
            icon={<ReceiptLongOutlinedIcon fontSize="small" />}
            name={`Counter ${bill.title}`}
            detail={openDetail(bill)}
          />
        </MenuItem>
      ))}
      {(mode === "new" || listedTables.length > 0) && (
        <ListSubheader>Tables</ListSubheader>
      )}
      {listedTables.map((table) => {
        const entry = tableOccupancy.get(table.id);
        const isInUse = entry?.status === "inUse";
        return (
          <MenuItem
            key={table.id}
            value={targetKey({ kind: "table", tableId: table.id })}
            sx={{ minHeight: 44 }}
          >
            <OptionRow
              icon={<TableRestaurantOutlinedIcon fontSize="small" />}
              name={table.name}
              status={<OccupancyMark status={isInUse ? "inUse" : "free"} />}
              detail={isInUse && entry ? openDetail(entry) : undefined}
            />
          </MenuItem>
        );
      })}
      {mode === "new" && listedTables.length === 0 && (
        <MenuItem disabled sx={{ minHeight: 44 }}>
          All tables are in use
        </MenuItem>
      )}
    </TextField>
  );
}
