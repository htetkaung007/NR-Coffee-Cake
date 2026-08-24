"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Box, Button, Card, Chip, Stack, Typography } from "@mui/material";
import {
  acceptCounterSessionAction,
  markSessionPaidAction,
  rejectCounterSessionAction,
} from "./action";

interface SessionOrderLine {
  id: number;
  quantity: number;
  menu: { name: string };
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

interface OrderListViewProps {
  sessions: SessionData[];
}

function ItemList({ orders }: { orders: SessionOrderLine[] }) {
  return (
    <Stack spacing={0.25} sx={{ mt: 0.5 }}>
      {orders.map((order) => (
        <Typography key={order.id} variant="caption" color="text.secondary">
          {order.quantity} × {order.menu.name}
        </Typography>
      ))}
    </Stack>
  );
}

export default function OrderListView({ sessions }: OrderListViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const awaitingApproval = sessions.filter(
    (session) => session.status === "PENDING_APPROVAL",
  );
  const active = sessions.filter((session) =>
    ["PENDING", "COOKING"].includes(session.status),
  );

  /** Every action button here has the same shape: run the Server
   *  Action inside a transition, then refresh so the list reflects
   *  the new status. Only the action itself differs between
   *  Accept/Reject/Mark Paid, so that's the one thing each button
   *  passes in rather than each writing its own copy of this. */
  function runAction(action: (sessionId: number) => Promise<unknown>) {
    return (sessionId: number) => {
      startTransition(async () => {
        await action(sessionId);
        router.refresh();
      });
    };
  }

  const handleAccept = runAction(acceptCounterSessionAction);
  const handleReject = runAction(rejectCounterSessionAction);
  const handleMarkPaid = runAction(markSessionPaidAction);

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Typography variant="h6" sx={{ mb: 2 }}>
        Orders
      </Typography>

      {/* --- Rough draft: Awaiting Approval --- */}
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
        Awaiting Approval ({awaitingApproval.length})
      </Typography>
      {awaitingApproval.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Nothing waiting right now.
        </Typography>
      ) : (
        <Stack spacing={1.5} sx={{ mb: 3 }}>
          {awaitingApproval.map((session) => (
            <Card
              key={session.id}
              variant="outlined"
              sx={{ p: 1.5, borderColor: "warning.main" }}
            >
              <Stack
                direction="row"
                sx={{
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {session.label}
                    </Typography>
                    <Chip label="Counter" size="small" variant="outlined" />
                  </Stack>
                  <ItemList orders={session.orders} />
                  {session.approvalExpiresAt && (
                    <Typography
                      variant="caption"
                      color="warning.main"
                      sx={{ display: "block", mt: 0.5 }}
                    >
                      Expires{" "}
                      {new Date(session.approvalExpiresAt).toLocaleTimeString()}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {session.total.toLocaleString()} MMK
                </Typography>
              </Stack>
              <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
                <Button
                  variant="contained"
                  size="small"
                  color="success"
                  disabled={isPending}
                  onClick={() => handleAccept(session.id)}
                >
                  Accept
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  color="error"
                  disabled={isPending}
                  onClick={() => handleReject(session.id)}
                >
                  Reject
                </Button>
              </Stack>
            </Card>
          ))}
        </Stack>
      )}

      {/* --- Rough draft: Active orders --- */}
      <Typography variant="body2" sx={{ mb: 1, fontWeight: 700 }}>
        Active Orders ({active.length})
      </Typography>
      {active.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          No active orders.
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {active.map((session) => (
            <Card key={session.id} variant="outlined" sx={{ p: 1.5 }}>
              <Stack
                direction="row"
                sx={{
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                }}
              >
                <Box>
                  <Stack
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: "center" }}
                  >
                    <Typography variant="body1" sx={{ fontWeight: 700 }}>
                      {session.label}
                    </Typography>
                    <Chip label={session.status} size="small" />
                  </Stack>
                  <ItemList orders={session.orders} />
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  {session.total.toLocaleString()} MMK
                </Typography>
              </Stack>
              <Button
                variant="contained"
                size="small"
                disabled={isPending}
                onClick={() => handleMarkPaid(session.id)}
                sx={{ mt: 1.5 }}
              >
                Mark as Paid
              </Button>
            </Card>
          ))}
        </Stack>
      )}
    </Box>
  );
}
