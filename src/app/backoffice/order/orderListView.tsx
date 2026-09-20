"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Badge,
  Box,
  Button,
  Card,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import {
  acceptCounterSessionAction,
  markEntryPaidAction,
  rejectCounterSessionAction,
} from "./action";

interface SessionOrderAddon {
  id: number;
  addon: { name: string };
}

interface SessionOrderLine {
  id: number;
  quantity: number;
  menu: { name: string };
  OrdersAddons: SessionOrderAddon[];
  note?: string | null;
}

interface SessionData {
  id: number;
  label: string;
  status: string;
  total: number;
  isCounter: boolean;
  approvalExpiresAt: Date | string | null;
  orders: SessionOrderLine[];
}

interface OrderEntry {
  key: string;
  title: string;
  isTableGroup: boolean;
  hasPendingApproval: boolean;
  combinedTotal: number;
  sessions: SessionData[];
}

interface OrderListViewProps {
  entries: OrderEntry[];
}

/** menu × quantity, plus each selected addon on its own line — a
 *  round's items are meaningless to a cashier/kitchen without knowing
 *  which addons were picked (a "no sugar" or "extra shot" is often
 *  the whole reason an item needs a second look), so this can't just
 *  show the menu name alone. */
function ItemList({ orders }: { orders: SessionOrderLine[] }) {
  return (
    <Stack spacing={0.5} sx={{ mt: 0.5 }}>
      {orders.map((order) => (
        <Box key={order.id}>
          <Typography variant="caption" color="text.secondary">
            {order.quantity} × {order.menu.name}
          </Typography>
          {order.OrdersAddons.length > 0 && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", pl: 2 }}
            >
              + {order.OrdersAddons.map((link) => link.addon.name).join(", ")}
            </Typography>
          )}
          {order.note && (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", pl: 2, overflowWrap: "anywhere" }}
            >
              Note: {order.note}
            </Typography>
          )}
        </Box>
      ))}
    </Stack>
  );
}

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: "Awaiting Approval",
  PENDING: "Accepted",
  COOKING: "Cooking",
};

/** One round (one OrderSession) within an entry — Accept/Reject only
 *  make sense while still PENDING_APPROVAL; an already-accepted round
 *  has nothing left to do here besides be visible (Mark-as-Paid now
 *  lives at the entry level — see OrderListView — so a whole table's
 *  rounds settle together, not one at a time). */
function RoundCard({
  session,
  isPending,
  onAccept,
  onReject,
}: {
  session: SessionData;
  isPending: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isAwaitingApproval = session.status === "PENDING_APPROVAL";

  return (
    <Card
      variant="outlined"
      sx={{
        p: 1.25,
        borderColor: isAwaitingApproval ? "warning.main" : "divider",
      }}
    >
      <Stack
        direction="row"
        sx={{ alignItems: "flex-start", justifyContent: "space-between" }}
      >
        <Box>
          <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <Typography variant="body2" sx={{ fontWeight: 700 }}>
              {session.label}
            </Typography>
            <Chip
              label={STATUS_LABEL[session.status] ?? session.status}
              size="small"
              color={isAwaitingApproval ? "warning" : "default"}
            />
          </Stack>
          <ItemList orders={session.orders} />
          {isAwaitingApproval && session.approvalExpiresAt && (
            <Typography
              variant="caption"
              color="warning.main"
              sx={{ display: "block", mt: 0.5 }}
            >
              Expires {new Date(session.approvalExpiresAt).toLocaleTimeString()}
            </Typography>
          )}
        </Box>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>
          {session.total.toLocaleString()} MMK
        </Typography>
      </Stack>

      {isAwaitingApproval && (
        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
          <Button
            variant="contained"
            size="small"
            color="success"
            disabled={isPending}
            onClick={onAccept}
          >
            Accept
          </Button>
          <Button
            variant="outlined"
            size="small"
            color="error"
            disabled={isPending}
            onClick={onReject}
          >
            Reject
          </Button>
        </Stack>
      )}
    </Card>
  );
}

/** One card per table (grouping every open round of that table's tab
 *  — see groupSessionsForDisplay) or per individual Counter session
 *  (never grouped with anything else). Collapsed by default: a
 *  cashier scanning the whole list only needs the combined total and
 *  whether something needs a decision (the red badge) until they
 *  choose to look closer. */
function EntryCard({ entry }: { entry: OrderEntry }) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(entry.hasPendingApproval);
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  function runAction(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  function handleMarkPaid() {
    setIsConfirmOpen(false);
    runAction(() =>
      markEntryPaidAction(entry.sessions.map((session) => session.id)),
    );
  }

  return (
    <Card variant="outlined" sx={{ p: 1.5 }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between" }}
      >
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Badge
            color="error"
            variant="dot"
            invisible={!entry.hasPendingApproval}
          >
            <Typography variant="body1" sx={{ fontWeight: 700 }}>
              {entry.title}
            </Typography>
          </Badge>
          {entry.isTableGroup && (
            <Chip label="Table" size="small" variant="outlined" />
          )}
          {entry.sessions.length > 1 && (
            <Chip
              label={`${entry.sessions.length} rounds`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {entry.combinedTotal.toLocaleString()} MMK
          </Typography>
          <IconButton
            size="small"
            aria-label={isExpanded ? "Collapse" : "Expand"}
            onClick={() => setIsExpanded((value) => !value)}
          >
            {isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Stack>
      </Stack>

      {isExpanded && (
        <Stack spacing={1} sx={{ mt: 1.5 }}>
          {entry.sessions.map((session) => (
            <RoundCard
              key={session.id}
              session={session}
              isPending={isPending}
              onAccept={() =>
                runAction(() => acceptCounterSessionAction(session.id))
              }
              onReject={() =>
                runAction(() => rejectCounterSessionAction(session.id))
              }
            />
          ))}
        </Stack>
      )}

      <Button
        variant="contained"
        size="small"
        fullWidth
        disabled={isPending || entry.hasPendingApproval}
        onClick={() => setIsConfirmOpen(true)}
        sx={{ mt: 1.5 }}
      >
        {entry.hasPendingApproval
          ? "Resolve the pending round first"
          : "Mark as Paid"}
      </Button>

      <Dialog open={isConfirmOpen} onClose={() => setIsConfirmOpen(false)}>
        <DialogTitle>Mark {entry.title} as paid?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This settles all {entry.sessions.length}{" "}
            {entry.sessions.length === 1 ? "order" : "orders"} for {entry.title}{" "}
            — {entry.combinedTotal.toLocaleString()} MMK total. This can&apos;t
            be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleMarkPaid} autoFocus>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
  );
}

export default function OrderListView({ entries }: OrderListViewProps) {
  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Orders
      </Typography>

      {entries.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Nothing open right now.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {entries.map((entry) => (
            <EntryCard key={entry.key} entry={entry} />
          ))}
        </Stack>
      )}
    </Box>
  );
}
