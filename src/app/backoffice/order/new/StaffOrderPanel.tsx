"use client";

import { useId, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  ButtonBase,
  CircularProgress,
  IconButton,
  Stack,
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

/** One line of the cart kept in this browser (lib/cart/staffCart.ts) —
 *  its prices are the ones last shown; the server re-prices on send. */
export interface StaffCartLine {
  /** Its position in the cart — how edits find it. */
  index: number;
  menuId: number;
  menuName: string;
  quantity: number;
  /** The unit price last shown (refreshed by every check). */
  price: number;
  /** With the prices last shown — part of what the line costs. */
  addons: LineAddon[];
  note: string | null;
  /** The latest check's word on it ("Only 1 left", "Sold out", …), with
   *  its fix-it action; null when it's fine or not checked yet. */
  notice: ReactNode;
  /** Can't be sent as it is (sold out, short, unavailable) — shown dimmed
   *  and left out of the total. */
  blocked: boolean;
}

/** The "did it go through?" check of a send whose answer never arrived
 *  (StaffOrderClient): in flight, or failed (offline) with a Retry. */
export type SendCheck =
  | { state: "checking" }
  | { state: "failed"; message: string };

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
  locked,
  onEdit,
  onChangeQuantity,
  onRemove,
}: {
  line: StaffCartLine;
  /** A send is unconfirmed — nothing on the line can change. */
  locked: boolean;
  onEdit: (line: StaffCartLine) => void;
  onChangeQuantity: (line: StaffCartLine, next: number) => void;
  onRemove: (line: StaffCartLine) => void;
}) {
  return (
    <Box
      component="li"
      sx={{ py: 1.5, borderBottom: 1, borderColor: "divider" }}
    >
      <Stack direction="row" spacing={1} sx={{ alignItems: "flex-start" }}>
        <ButtonBase
          disabled={locked}
          onClick={() => onEdit(line)}
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
            // Dimmed, not hidden: the staff still sees what can't go.
            opacity: line.blocked ? 0.6 : 1,
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

      {line.notice && <Box sx={{ mt: 1 }}>{line.notice}</Box>}

      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", justifyContent: "flex-end", mt: 1 }}
      >
        {line.quantity === 1 ? (
          <IconButton
            aria-label={`Remove ${line.menuName}`}
            disabled={locked}
            onClick={() => onRemove(line)}
            sx={stepperButtonSx}
          >
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        ) : (
          <IconButton
            aria-label={`One less ${line.menuName}`}
            disabled={locked}
            onClick={() => onChangeQuantity(line, line.quantity - 1)}
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
          disabled={locked || line.quantity >= MAX_LINE_QUANTITY}
          onClick={() => onChangeQuantity(line, line.quantity + 1)}
          sx={stepperButtonSx}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>
    </Box>
  );
}

interface StaffOrderPanelProps {
  /** "Current order", or with its target in the sheet ("Current order —
   *  Table 3"), where the "Order for" picker isn't in sight. */
  title: string;
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
  /** A send is out or unanswered: the lines can't be changed (so edited
   *  lines never go out under the old request id). */
  locked: boolean;
  /** The check of an unanswered send, shown above the lines. */
  sendCheck: SendCheck | null;
  onRetryCheck: () => void;
}

/**
 * The current order — the ONE markup behind the lg+ "Current order" card
 * and the below-lg bottom sheet. A flex column: the header and the footer
 * (total + Send to kitchen) stay put, only the lines scroll. Which table
 * it's for is picked outside it (OrderTargetPicker).
 */
export default function StaffOrderPanel({
  title,
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
  locked,
  sendCheck,
  onRetryCheck,
}: StaffOrderPanelProps) {
  const reasonId = useId();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      <Box sx={{ px: 2, pt: 2 }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{ alignItems: "center", justifyContent: "space-between" }}
        >
          <Typography
            component="h2"
            variant="h6"
            sx={{ minWidth: 0, overflowWrap: "anywhere" }}
          >
            {title}
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
        {error && (
          <Alert severity="error" onClose={onDismissError} sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        )}
        {sendCheck?.state === "checking" && (
          <Alert
            severity="info"
            role="status"
            icon={<CircularProgress size={20} color="inherit" />}
            sx={{ mt: 1.5 }}
          >
            Checking whether the order went through…
          </Alert>
        )}
        {sendCheck?.state === "failed" && (
          <Alert
            severity="warning"
            role="status"
            action={
              <Button color="inherit" onClick={onRetryCheck} sx={{ minHeight: 44 }}>
                Retry
              </Button>
            }
            sx={{ mt: 1.5 }}
          >
            {sendCheck.message} The items stay locked so the order
            can&apos;t be sent twice.
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
                key={line.index}
                line={line}
                locked={locked}
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
