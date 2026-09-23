"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TableRestaurantIcon from "@mui/icons-material/TableRestaurant";
import { useAutoRefresh } from "@/app/lib/hooks/useAutoRefresh";
import { markEntryPaidAction } from "./action";

interface OrderEntry {
  key: string;
  title: string;
  isTableGroup: boolean;
  hasPendingApproval: boolean;
  combinedTotal: number;
  /** Only ids — Mark-as-Paid settles every round together. The items
   *  themselves are shown on the entry's detail page. */
  sessions: { id: number }[];
}

interface OrderListViewProps {
  entries: OrderEntry[];
}

/** One card per table (grouping every open round of that table's tab
 *  — see groupSessionsForDisplay) or per individual Counter session
 *  (never grouped with anything else). The card only shows the combined
 *  total and whether something needs a decision (the red dot in the
 *  corner); the rounds themselves — items, addons, Accept/Reject — live
 *  on the entry's detail page ([entryKey]/page.tsx). */
function EntryCard({ entry }: { entry: OrderEntry }) {
  const router = useRouter();
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
    // display: block so the card fills its grid cell (Badge is inline-flex).
    <Badge
      color="error"
      variant="dot"
      overlap="rectangular"
      invisible={!entry.hasPendingApproval}
      sx={{ display: "block" }}
    >
      <Card
        variant="outlined"
        sx={{
          borderColor: entry.hasPendingApproval ? "error.main" : "divider",
        }}
      >
        <CardContent>
          <Stack spacing={1} sx={{ alignItems: "center", textAlign: "center" }}>
            <Avatar sx={{ bgcolor: "info.main", width: 56, height: 56 }}>
              {entry.isTableGroup ? (
                <TableRestaurantIcon />
              ) : (
                <StorefrontIcon />
              )}
            </Avatar>

            <Typography variant="body1">{entry.title}</Typography>
            {entry.sessions.length > 1 && (
              <Chip
                label={`${entry.sessions.length} rounds`}
                size="small"
                variant="outlined"
              />
            )}

            <Box>
              <Typography variant="body2" color="text.secondary">
                Total amount
              </Typography>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>
                {entry.combinedTotal.toLocaleString()} MMK
              </Typography>
            </Box>

            <Button
              component={Link}
              href={`/backoffice/order/${entry.key}`}
              variant="outlined"
              size="small"
              fullWidth
            >
              View order details
            </Button>
            <Button
              variant="contained"
              color="success"
              size="small"
              fullWidth
              disabled={isPending || entry.hasPendingApproval}
              onClick={() => setIsConfirmOpen(true)}
            >
              Paid
            </Button>
            {entry.hasPendingApproval && (
              <Typography variant="body2" color="warning.main">
                Needs approval
              </Typography>
            )}
          </Stack>
        </CardContent>
      </Card>

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
    </Badge>
  );
}

export default function OrderListView({ entries }: OrderListViewProps) {
  // So a newly submitted table/counter order shows its red dot without
  // the cashier reloading.
  useAutoRefresh();

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
        <Grid container spacing={1.5}>
          {entries.map((entry) => (
            <Grid key={entry.key} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <EntryCard entry={entry} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
