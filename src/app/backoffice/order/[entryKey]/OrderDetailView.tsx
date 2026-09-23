"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Card,
  CardActions,
  CardHeader,
  Chip,
  Divider,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableFooter,
  TableHead,
  TableRow,
  Toolbar,
  Typography,
} from "@mui/material";
import ArrowBackIosNewIcon from "@mui/icons-material/ArrowBackIosNew";
import StickyNote2Icon from "@mui/icons-material/StickyNote2";
import { useAutoRefresh } from "@/app/lib/hooks/useAutoRefresh";
import {
  acceptCounterSessionAction,
  rejectCounterSessionAction,
} from "../action";

interface RoundLine {
  id: number;
  quantity: number;
  menuName: string;
  addonNames: string[];
  note: string | null;
  price: number;
}

interface Round {
  id: number;
  orderNumber: string;
  createdAt: string;
  status: string;
  approvalExpiresAt: string | null;
  total: number;
  lines: RoundLine[];
}

interface OrderDetailViewProps {
  title: string;
  isTableGroup: boolean;
  combinedTotal: number;
  rounds: Round[];
}

const STATUS_CHIP: Record<
  string,
  { label: string; color: "warning" | "success" | "info" }
> = {
  PENDING_APPROVAL: { label: "New", color: "warning" },
  PENDING: { label: "Accepted", color: "success" },
  COOKING: { label: "Cooking", color: "info" },
};

/** One round (one OrderSession): its items, its subtotal, and — only
 *  while it's still awaiting a decision — Accept/Reject directly under
 *  it, so the cashier acts on exactly the round they're looking at. */
function RoundSection({
  round,
  isPending,
  onAccept,
  onReject,
}: {
  round: Round;
  isPending: boolean;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isAwaitingApproval = round.status === "PENDING_APPROVAL";
  const statusChip = STATUS_CHIP[round.status];

  return (
    <Card
      variant="outlined"
      sx={{ borderColor: isAwaitingApproval ? "warning.main" : "divider" }}
    >
      <CardHeader
        title={`Order ${round.orderNumber}`}
        subheader={new Date(round.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}
        action={
          statusChip && (
            <Chip
              label={statusChip.label}
              color={statusChip.color}
              size="small"
            />
          )
        }
        // Locale time differs between the server render and the browser —
        // suppress the (harmless) hydration mismatch on the time.
        slotProps={{
          title: { variant: "body1" },
          subheader: { variant: "body2", suppressHydrationWarning: true },
        }}
      />

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Item</TableCell>
              <TableCell align="center">Qty</TableCell>
              <TableCell>Add-ons</TableCell>
              <TableCell>Note</TableCell>
              <TableCell align="right">Price</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {round.lines.map((line) => (
              <TableRow key={line.id} sx={{ verticalAlign: "top" }}>
                <TableCell>
                  <Typography variant="body1">{line.menuName}</Typography>
                </TableCell>
                <TableCell align="center">{line.quantity}</TableCell>
                <TableCell>
                  {line.addonNames.length > 0 ? (
                    <Stack spacing={0.5} sx={{ alignItems: "flex-start" }}>
                      {line.addonNames.map((name, index) => (
                        <Chip
                          key={`${name}-${index}`}
                          label={name}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Stack>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  {line.note ? (
                    <Alert
                      severity="warning"
                      variant="outlined"
                      icon={<StickyNote2Icon fontSize="inherit" />}
                    >
                      {line.note}
                    </Alert>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell align="right">
                  {line.price.toLocaleString()} MMK
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableCell colSpan={4} align="right">
                Subtotal (this order)
              </TableCell>
              <TableCell align="right">
                <Typography variant="body1" sx={{ fontWeight: 800 }}>
                  {round.total.toLocaleString()} MMK
                </Typography>
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </TableContainer>

      {isAwaitingApproval && (
        <>
          <Divider />
          <CardActions>
            <Typography
              variant="body2"
              color="warning.main"
              suppressHydrationWarning
              sx={{ flexGrow: 1, pl: 1 }}
            >
              {round.approvalExpiresAt &&
                `Expires ${new Date(round.approvalExpiresAt).toLocaleTimeString()}`}
            </Typography>
            <Button
              variant="outlined"
              color="error"
              disabled={isPending}
              onClick={onReject}
            >
              Reject
            </Button>
            <Button
              variant="contained"
              color="success"
              disabled={isPending}
              onClick={onAccept}
            >
              Accept
            </Button>
          </CardActions>
        </>
      )}
    </Card>
  );
}

export default function OrderDetailView({
  title,
  isTableGroup,
  combinedTotal,
  rounds,
}: OrderDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // A new round on this table appears (with its own Accept/Reject)
  // without the cashier leaving and re-opening the page.
  useAutoRefresh();

  function runAction(action: () => Promise<unknown>) {
    startTransition(async () => {
      await action();
      router.refresh();
    });
  }

  const orderCountLabel = `${rounds.length} ${rounds.length === 1 ? "order" : "orders"}`;

  return (
    // minHeight keeps the sticky total at the bottom of the viewport even
    // when there are only a couple of rounds.
    <Stack
      sx={{
        minHeight: { xs: "calc(100vh - 64px)", md: "calc(100vh - 112px)" },
      }}
    >
      <Box sx={{ flexGrow: 1, p: { xs: 1.5, sm: 2, md: 0 } }}>
        <Stack
          direction="row"
          spacing={1.5}
          sx={{ alignItems: "center", mb: 2 }}
        >
          <IconButton
            component={Link}
            href="/backoffice/order"
            aria-label="Back to orders"
          >
            <ArrowBackIosNewIcon fontSize="small" />
          </IconButton>
          <Box>
            <Typography variant="h6">{title}</Typography>
            <Chip label={orderCountLabel} color="warning" size="small" />
          </Box>
        </Stack>

        <Stack spacing={2}>
          {rounds.map((round) => (
            <RoundSection
              key={round.id}
              round={round}
              isPending={isPending}
              onAccept={() =>
                runAction(() => acceptCounterSessionAction(round.id))
              }
              onReject={() =>
                runAction(() => rejectCounterSessionAction(round.id))
              }
            />
          ))}
        </Stack>
      </Box>

      {/* Pinned to the bottom so the running total stays in view however
          many rounds a table has piled up. */}
      <AppBar position="sticky" color="default" sx={{ top: "auto", bottom: 0 }}>
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="body1">
              {isTableGroup ? "Table total" : "Total"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {orderCountLabel} · combined
            </Typography>
          </Box>
          {/* h6's size, but the body font — h6 is the serif display face,
              which reads poorly for figures. */}
          <Typography
            variant="h6"
            sx={(theme) => ({ fontFamily: theme.typography.body1.fontFamily })}
          >
            {combinedTotal.toLocaleString()} MMK
          </Typography>
        </Toolbar>
      </AppBar>
    </Stack>
  );
}
