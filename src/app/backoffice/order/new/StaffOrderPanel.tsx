"use client";

import { useId, type Ref } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlinedIcon from "@mui/icons-material/DeleteOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import { lineBreakdown, type LineAddon } from "@/app/lib/order/orderTotals";
import BillLineRows from "@/app/components/BillLineRows";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import BillTotal from "../BillTotal";
import { moneySx } from "../orderTypography";

/** Highest quantity a line can be raised to — the same cap the staff
 *  cart schema enforces (staffOrderSchema's `quantity`). */
const MAX_LINE_QUANTITY = 99;

export interface StaffTable {
  id: number;
  name: string;
  isCounter: boolean;
}

export interface StaffCartLine {
  /** Negative while a quick add hasn't been saved yet (no row id). */
  id: number;
  menuId: number;
  menuName: string;
  quantity: number;
  /** The line's unit price snapshot (today's price while pending). */
  price: number;
  /** With their own price snapshots — part of what the line costs. */
  addons: LineAddon[];
  note: string | null;
  /** A save for this line is in flight — its controls pause. */
  isBusy: boolean;
}

/** "Counter (takeaway)" for the counter, the plain name for a table.
 *  More than one counter keeps each one's own name to tell them apart. */
function tableLabel(table: StaffTable, counterCount: number) {
  if (!table.isCounter) return table.name;
  return counterCount > 1 ? `${table.name} (takeaway)` : "Counter (takeaway)";
}

const stepperButtonSx = {
  width: 44,
  height: 44,
  border: 1,
  borderColor: "divider",
  borderRadius: 1,
  [hoverCapableMedia]: { "&:hover": { borderColor: "text.secondary" } },
  "&.Mui-disabled": { opacity: 0.4 },
} as const;

function OrderLine({
  line,
  onEdit,
  onChangeQuantity,
  onRemove,
}: {
  line: StaffCartLine;
  onEdit: (line: StaffCartLine) => void;
  onChangeQuantity: (line: StaffCartLine, next: number) => void;
  onRemove: (line: StaffCartLine) => void;
}) {
  // While busy the buttons stay focusable (aria-disabled, clicks
  // ignored) so repeated − / + presses don't drop keyboard focus.
  const guard = (action: () => void) => () => {
    if (!line.isBusy) action();
  };

  return (
    <Box
      component="li"
      sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <ButtonBase
          onClick={guard(() => onEdit(line))}
          aria-disabled={line.isBusy}
          aria-label={`Edit ${line.menuName}`}
          sx={(theme) => ({
            flex: 1,
            minWidth: 0,
            minHeight: 44,
            display: "block",
            textAlign: "left",
            px: 1,
            mx: -1,
            borderRadius: 1,
            [hoverCapableMedia]: {
              "&:hover": { bgcolor: theme.palette.action.hover },
            },
            "&.Mui-focusVisible": {
              outline: `2px solid ${theme.palette.primary.main}`,
              outlineOffset: 2,
            },
          })}
        >
          {/* Itemised like every bill: the item, then each add-on with
             what it adds — the same rows as the order detail's bill. */}
          <BillLineRows
            rows={lineBreakdown({
              name: line.menuName,
              quantity: line.quantity,
              unitPrice: line.price,
              addons: line.addons,
            })}
            itemAmountSx={moneySx}
          />
          {line.note && (
            <Stack
              direction="row"
              spacing={0.5}
              sx={{ alignItems: "flex-start", color: "text.secondary" }}
            >
              <EditOutlinedIcon
                aria-hidden
                sx={{ fontSize: "1rem", mt: 0.25 }}
              />
              <Typography variant="body2" sx={{ minWidth: 0 }}>
                {line.note}
              </Typography>
            </Stack>
          )}
        </ButtonBase>
      </Stack>

      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", justifyContent: "flex-end", mt: 1 }}
      >
        {line.quantity === 1 ? (
          <IconButton
            aria-label={`Remove ${line.menuName}`}
            aria-disabled={line.isBusy}
            onClick={guard(() => onRemove(line))}
            sx={stepperButtonSx}
          >
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        ) : (
          <IconButton
            aria-label={`One less ${line.menuName}`}
            aria-disabled={line.isBusy}
            onClick={guard(() => onChangeQuantity(line, line.quantity - 1))}
            sx={stepperButtonSx}
          >
            <RemoveIcon fontSize="small" />
          </IconButton>
        )}
        <Typography
          variant="body1"
          aria-label={`Quantity ${line.quantity}`}
          sx={{ minWidth: 32, textAlign: "center" }}
        >
          {line.quantity}
        </Typography>
        <IconButton
          aria-label={`One more ${line.menuName}`}
          aria-disabled={line.isBusy}
          disabled={line.quantity >= MAX_LINE_QUANTITY}
          onClick={guard(() => onChangeQuantity(line, line.quantity + 1))}
          sx={stepperButtonSx}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

interface StaffOrderPanelProps {
  tables: StaffTable[];
  tableId: number | "";
  onTableChange: (tableId: number) => void;
  /** Shown under the picker when an add was tried with no table yet. */
  tablePrompt: boolean;
  pickerRef?: Ref<HTMLDivElement>;
  autoFocusPicker?: boolean;
  lines: StaffCartLine[];
  total: number;
  onEdit: (line: StaffCartLine) => void;
  onChangeQuantity: (line: StaffCartLine, next: number) => void;
  onRemove: (line: StaffCartLine) => void;
  error: string | null;
  onDismissError: () => void;
  /** Why "Send to kitchen" is off; null when it can be sent. */
  sendBlockedReason: string | null;
  isSending: boolean;
  onSend: () => void;
  /** Given in the drawer/sheet — shows a close (×) button. */
  onClose?: () => void;
}

/**
 * The current order — the ONE markup behind the md+ side panel and the
 * below-md drawer / bottom sheet. A flex column: the picker and the
 * footer (total + Send to kitchen) stay put, only the lines scroll.
 */
export default function StaffOrderPanel({
  tables,
  tableId,
  onTableChange,
  tablePrompt,
  pickerRef,
  autoFocusPicker = false,
  lines,
  total,
  onEdit,
  onChangeQuantity,
  onRemove,
  error,
  onDismissError,
  sendBlockedReason,
  isSending,
  onSend,
  onClose,
}: StaffOrderPanelProps) {
  const reasonId = useId();
  const promptId = useId();
  const counters = tables.filter((table) => table.isCounter);
  // Counter first, then the tables.
  const orderedTables = [
    ...counters,
    ...tables.filter((table) => !table.isCounter),
  ];

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Box sx={{ px: 2, pt: 2 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", justifyContent: "space-between", mb: 2 }}
        >
          <Typography component="h2" variant="h6">
            Current order
          </Typography>
          {onClose && (
            <IconButton
              aria-label="Close order"
              onClick={onClose}
              sx={{ width: 44, height: 44 }}
            >
              <CloseIcon />
            </IconButton>
          )}
        </Stack>
        <TextField
          select
          label="Table"
          value={tableId}
          ref={pickerRef}
          autoFocus={autoFocusPicker}
          onChange={(event) => onTableChange(Number(event.target.value))}
          error={tablePrompt}
          helperText={tablePrompt ? "Choose a table or Counter first" : undefined}
          slotProps={{
            formHelperText: { id: promptId },
            select: { "aria-describedby": tablePrompt ? promptId : undefined },
          }}
        >
          {orderedTables.map((table) => (
            <MenuItem key={table.id} value={table.id}>
              {tableLabel(table, counters.length)}
            </MenuItem>
          ))}
        </TextField>
        {error && (
          <Alert severity="error" onClose={onDismissError} sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}
      </Box>

      <Box sx={{ flex: 1, minHeight: 0, overflowY: "auto", px: 2, mt: 1 }}>
        {lines.length === 0 ? (
          <Stack
            spacing={1}
            sx={{ alignItems: "center", textAlign: "center", py: 6 }}
          >
            <ReceiptLongOutlinedIcon
              fontSize="large"
              sx={{ color: "text.secondary" }}
            />
            <Typography variant="body1">No items yet</Typography>
            <Typography variant="body2" color="text.secondary">
              Tap a menu to add it
            </Typography>
          </Stack>
        ) : (
          <Box
            component="ul"
            aria-label="Items in this order"
            sx={{ listStyle: "none", m: 0, p: 0 }}
          >
            {lines.map((line) => (
              <OrderLine
                key={line.id}
                line={line}
                onEdit={onEdit}
                onChangeQuantity={onChangeQuantity}
                onRemove={onRemove}
              />
            ))}
          </Box>
        )}
      </Box>

      <Box sx={{ p: 2, borderTop: 1, borderColor: "divider" }}>
        <BillTotal label="Total" amount={total} sx={{ mb: 2 }} />
        <Button
          fullWidth
          variant="contained"
          color="primary"
          disabled={sendBlockedReason !== null || isSending}
          aria-describedby={sendBlockedReason ? reasonId : undefined}
          onClick={onSend}
          startIcon={
            isSending ? <CircularProgress size={18} color="inherit" /> : undefined
          }
          sx={{ minHeight: 44 }}
        >
          {isSending ? "Sending…" : "Send to kitchen"}
        </Button>
        {sendBlockedReason && (
          <Typography
            id={reasonId}
            variant="body2"
            color="text.secondary"
            sx={{ mt: 1 }}
          >
            {sendBlockedReason}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
