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
import MenuThumb from "@/app/components/MenuThumb";
import StatusChip, { StatusDot } from "./StatusChip";
import RejectReasonDialog from "../RejectReasonDialog";
import type { ActionResult } from "@/app/lib/actionResult";
import type { RejectReason } from "@/app/lib/order/rejectReason";
import { countLabel, formatClockTime } from "@/app/lib/orderFormat";

export interface RoundLine {
  id: number;
  quantity: number;
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
  /** Total quantity across the round's lines. */
  itemCount: number;
  lines: RoundLine[];
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
function LineRow({ line }: { line: RoundLine }) {
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
      <Thumbnail name={line.menuName} imageUrl={line.imageUrl} />
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" sx={{ overflowWrap: "anywhere" }}>
          <strong>{line.quantity} ×</strong> {line.menuName}
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
      </Box>
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
}) {
  const isAwaitingApproval = round.status === "PENDING_APPROVAL";
  const [isRejectOpen, setIsRejectOpen] = useState(false);

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
          <LineRow key={line.id} line={line} />
        ))}
      </Box>

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
