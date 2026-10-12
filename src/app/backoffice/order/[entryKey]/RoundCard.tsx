"use client";

import { useState } from "react";
import {
  Box,
  Button,
  Card,
  Divider,
  Stack,
  Typography,
} from "@mui/material";
import { alpha } from "@mui/material/styles";
import CheckIcon from "@mui/icons-material/Check";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import MenuThumb from "@/app/components/MenuThumb";
import StatusChip, { StatusDot } from "./StatusChip";
import RejectReasonDialog from "../RejectReasonDialog";
import VoidItemDialog, { type VoidRequest } from "./VoidItemDialog";
import type { ActionResult } from "@/app/lib/actionResult";
import type { RejectReason } from "@/app/lib/order/rejectReason";
import { countLabel, formatClockTime } from "@/app/lib/orderFormat";

/** One void on a line, as staff read it (lib/order/voids). */
interface RoundLineVoid {
  quantity: number;
  /** The reason in words ("Wrong item"). */
  reason: string;
  /** Staff's note (Other only) — shown to staff, never to customers. */
  note: string | null;
  /** ISO time. */
  at: string;
  /** Who voided it — the name frozen at void time, kept after the user
   *  is removed; "—" when unknown (lib/order/voids.voidedByLabel). */
  by: string;
}

export interface RoundLine {
  id: number;
  /** Every Order row behind this (possibly merged) line — what a void
   *  acts on. */
  orderIds: number[];
  /** As ordered. */
  quantity: number;
  /** Still on the order (quantity less voids) — also how many can still
   *  be voided. */
  remaining: number;
  voids: RoundLineVoid[];
  menuName: string;
  imageUrl: string | null;
  /** Every add-on on the line, in the order picked. */
  addonNames: string[];
  note: string | null;
}

export interface Round {
  id: number;
  orderNumber: string;
  createdAt: string;
  status: string;
  /** When the round is due, if it's awaiting approval (approvalDeadline):
   *  ISO time, and whether it cancels itself then (Counter) or only
   *  becomes overdue (Table). */
  approvalDue: { at: string; autoCancels: boolean } | null;
  /** Total quantity across the round's lines, voided units left out. */
  itemCount: number;
  /** Accepted and still open — its lines can be voided
   *  (lib/order/voids.isVoidableRoundStatus). */
  canVoid: boolean;
  lines: RoundLine[];
}

/** "Voided · 12:20 · Aye · Wrong item" ("Voided ×2 · …" for several). */
function voidSummary(entry: RoundLineVoid) {
  return [
    entry.quantity > 1 ? `Voided ×${entry.quantity}` : "Voided",
    formatClockTime(entry.at),
    entry.by,
    entry.reason,
  ]
    .filter(Boolean)
    .join(" · ");
}

const THUMBNAIL_SIZE = 40;

/** The menu item's own photo, or a first-letter tile when it has none
 *  or it fails to load (MenuThumb). Decorative: the item's name is right
 *  next to it. */
function Thumbnail({ name, imageUrl }: { name: string; imageUrl: string | null }) {
  return (
    <Box
      sx={{
        width: THUMBNAIL_SIZE,
        height: THUMBNAIL_SIZE,
        flexShrink: 0,
        overflow: "hidden",
        borderRadius: 1,
        border: 1,
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <MenuThumb name={name} imageUrl={imageUrl} />
    </Box>
  );
}

/** One item, for the kitchen (no prices): the thumbnail, then "1 × Moat
 *  Hnin" with the quantity first, the add-ons right under the name ("+
 *  Default Addon1 · + Default Addon2"), and the customer's note on its
 *  own line. One column at every width — nothing is pushed to the far
 *  right on a phone. */
function LineRow({
  line,
  onRequestVoid,
}: {
  line: RoundLine;
  /** Given when this viewer may void and the line can be: shows "Void". */
  onRequestVoid?: () => void;
}) {
  const voided = line.quantity - line.remaining;
  const isFullyVoided = line.remaining === 0;

  return (
    <Stack
      component="li"
      direction="row"
      spacing={{ xs: 1, sm: 2 }}
      sx={{
        alignItems: "flex-start",
        py: 1,
        "& + &": { borderTop: 1, borderColor: "divider" },
      }}
    >
      {/* A fully voided line stays visible, dimmed (DESIGN.md Rule 26) —
          the struck-through text and "Voided" words say why. */}
      <Box sx={{ opacity: isFullyVoided ? 0.6 : 1, flexShrink: 0 }}>
        <Thumbnail name={line.menuName} imageUrl={line.imageUrl} />
      </Box>
      <Box sx={{ flex: 1, minWidth: 0, opacity: isFullyVoided ? 0.6 : 1 }}>
        <Typography
          variant="body1"
          sx={{
            overflowWrap: "anywhere",
            textDecoration: isFullyVoided ? "line-through" : "none",
          }}
        >
          <strong>{isFullyVoided ? line.quantity : line.remaining} ×</strong>{" "}
          {line.menuName}
          {!isFullyVoided && voided > 0 && ` (${voided} voided)`}
        </Typography>
        {line.addonNames.length > 0 && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ overflowWrap: "anywhere" }}
          >
            {line.addonNames.map((name) => `+ ${name}`).join(" · ")}
          </Typography>
        )}
        {line.note && (
          <Stack
            direction="row"
            spacing={0.5}
            sx={{ alignItems: "flex-start", mt: 0.5, color: "text.secondary" }}
          >
            <EditOutlinedIcon
              titleAccess="Note"
              sx={{ fontSize: "1rem", mt: 0.25, flexShrink: 0 }}
            />
            {/* Plain text — React escapes it. */}
            <Typography
              variant="body2"
              sx={{ minWidth: 0, overflowWrap: "anywhere" }}
            >
              {line.note}
            </Typography>
          </Stack>
        )}
        {line.voids.map((entry, index) => (
          <Box key={index} sx={{ mt: 0.5 }}>
            <Typography
              variant="body2"
              color="text.secondary"
              suppressHydrationWarning
              sx={{ overflowWrap: "anywhere" }}
            >
              {voidSummary(entry)}
            </Typography>
            {entry.note && (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ overflowWrap: "anywhere" }}
              >
                “{entry.note}”
              </Typography>
            )}
          </Box>
        ))}
      </Box>
      {onRequestVoid && (
        // A direct, destructive action — it still asks first
        // (VoidItemDialog: how many, why, back in stock).
        <Button
          variant="outlined"
          color="error"
          size="small"
          startIcon={<CancelOutlinedIcon />}
          aria-label={`Void ${line.menuName}`}
          aria-haspopup="dialog"
          onClick={onRequestVoid}
          sx={(theme) => ({
            minHeight: 44,
            flexShrink: 0,
            alignSelf: "flex-start",
            [hoverCapableMedia]: {
              "&:hover": {
                bgcolor: alpha(theme.palette.error.main, 0.08),
              },
            },
          })}
        >
          Void
        </Button>
      )}
    </Stack>
  );
}

/** One round (one OrderSession). A round awaiting approval gets a
 *  warning border, a warning-tinted header and Reject/Accept at the
 *  bottom, so the cashier acts on exactly the round they're reading. */
export default function RoundCard({
  round,
  isPending,
  onAccept,
  onReject,
  onVoid,
}: {
  round: Round;
  /** An action is in flight — disables Accept/Reject. */
  isPending: boolean;
  onAccept: () => void;
  /** Rejects this round with the reason (and, for Other, the note)
   *  picked in the dialog. */
  onReject: (
    reason: RejectReason,
    note?: string,
  ) => Promise<ActionResult<unknown>>;
  /** Voids items off one of its lines — given only when the viewer may
   *  void (display only: the action checks ORDERS_VOID itself). */
  onVoid?: (
    line: RoundLine,
    request: VoidRequest,
  ) => Promise<ActionResult<unknown>>;
}) {
  const isAwaitingApproval = round.status === "PENDING_APPROVAL";
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [voidingLineId, setVoidingLineId] = useState<number | null>(null);
  const voidingLine =
    round.lines.find((line) => line.id === voidingLineId) ?? null;

  return (
    <Card
      variant="outlined"
      sx={{ borderColor: isAwaitingApproval ? "warning.main" : "divider" }}
    >
      <Stack
        direction="row"
        useFlexGap
        sx={(theme) => ({
          flexWrap: "wrap",
          alignItems: "center",
          gap: 1,
          px: { xs: 1, sm: 2 },
          py: 1,
          borderBottom: 1,
          borderColor: "divider",
          bgcolor: isAwaitingApproval
            ? alpha(theme.palette.warning.main, 0.12)
            : "transparent",
        })}
      >
        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
          <Typography component="h2" variant="body1">
            Order {round.orderNumber}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            suppressHydrationWarning
          >
            {formatClockTime(round.createdAt)} ·{" "}
            {countLabel(round.itemCount, "item", "items")}
          </Typography>
        </Box>
        {isAwaitingApproval ? (
          <StatusChip
            tone="warning"
            icon={<StatusDot />}
            label="Needs approval"
          />
        ) : (
          <StatusChip tone="success" icon={<CheckIcon />} label="Accepted" />
        )}
      </Stack>

      <Box
        component="ul"
        sx={{ listStyle: "none", m: 0, px: { xs: 1, sm: 2 }, py: 1 }}
      >
        {round.lines.map((line) => (
          <LineRow
            key={line.id}
            line={line}
            onRequestVoid={
              onVoid && round.canVoid && line.remaining > 0
                ? () => setVoidingLineId(line.id)
                : undefined
            }
          />
        ))}
      </Box>

      {onVoid && (
        <VoidItemDialog
          open={voidingLine !== null}
          menuName={voidingLine?.menuName ?? ""}
          remaining={voidingLine?.remaining ?? 1}
          onClose={() => setVoidingLineId(null)}
          onVoid={(request) => onVoid(voidingLine!, request)}
        />
      )}

      {isAwaitingApproval && (
        <>
          <Divider />
          <Stack
            direction="row"
            useFlexGap
            sx={{
              flexWrap: "wrap",
              alignItems: "center",
              gap: 1,
              px: { xs: 1, sm: 2 },
              py: 1,
            }}
          >
            <Typography
              variant="body2"
              color="warning.main"
              suppressHydrationWarning
              sx={{ flexGrow: 1, width: { xs: "100%", sm: "auto" } }}
            >
              {round.approvalDue &&
                `${round.approvalDue.autoCancels ? "Expires" : "Confirm by"} ${formatClockTime(round.approvalDue.at)}`}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              disabled={isPending}
              aria-haspopup="dialog"
              onClick={() => setIsRejectOpen(true)}
              sx={{ minHeight: 44, flexGrow: { xs: 1, sm: 0 } }}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={<CheckIcon />}
              disabled={isPending}
              onClick={onAccept}
              sx={{ minHeight: 44, flexGrow: { xs: 1, sm: 0 } }}
            >
              Accept
            </Button>
          </Stack>
          <RejectReasonDialog
            open={isRejectOpen}
            orderNumber={round.orderNumber}
            onClose={() => setIsRejectOpen(false)}
            onReject={onReject}
          />
        </>
      )}
    </Card>
  );
}
