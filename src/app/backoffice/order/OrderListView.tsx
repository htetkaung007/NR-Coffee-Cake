"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Badge,
  Box,
  Button,
  Card,
  CardActionArea,
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
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import { keyframes } from "@mui/material/styles";
import { useAutoRefresh } from "@/app/lib/hooks/useAutoRefresh";
import { useDocumentTitle } from "@/app/lib/hooks/useDocumentTitle";
import {
  useNewPendingRounds,
  type NewPendingRoundsEvent,
} from "@/app/lib/hooks/useNewPendingRounds";
import { useOrderAlertSound } from "@/app/lib/hooks/useOrderAlertSound";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { markEntryPaidAction } from "./action";
import ApprovalCountdown from "./ApprovalCountdown";
import NewOrderToast, {
  describeNewRounds,
  type NewOrderNotice,
} from "./NewOrderToast";
import OrderSoundToggle from "./OrderSoundToggle";

interface OrderEntry {
  key: string;
  title: string;
  isTableGroup: boolean;
  hasPendingApproval: boolean;
  /** ISO time the most urgent pending round auto-cancels; null when
   *  nothing in the entry is awaiting approval. */
  earliestApprovalExpiresAt: string | null;
  combinedTotal: number;
  /** Only ids and status — Mark-as-Paid settles every round together.
   *  The items themselves are shown on the entry's detail page. */
  sessions: { id: number; status: string }[];
}

interface OrderListViewProps {
  entries: OrderEntry[];
}

type SourceFilter = "all" | "table" | "counter";

/** One-time cue for a card a new round just landed on: "appear" for a
 *  card that wasn't on the list a refresh ago, "highlight" for one that
 *  already was. */
type CardEffect = "appear" | "highlight";

// New rounds arrive often on a busy shift, so both cues are short and
// subtle (one-shot, never looping) and only touch transform/opacity.
// The highlight fades a theme-tinted overlay's opacity — the card's
// own background/border/shadow are never animated. With reduced motion
// the global rule in globals.css collapses both to ~instant; the
// card's pending badge, border and "Needs approval" text still mark it.
const APPEAR_MS = 250;
const HIGHLIGHT_MS = 500;
const cardAppear = keyframes`
  from { opacity: 0; transform: scale(0.97); }
  to { opacity: 1; transform: scale(1); }
`;
const highlightFade = keyframes`
  from { opacity: 0.3; }
  to { opacity: 0; }
`;

// The two sources are told apart by icon + label text first; these two
// palette colors are only a thin accent on top of that. Deliberately
// not error/warning/success — those already mean order STATUS.
const TABLE_ACCENT = "info.main";
const COUNTER_ACCENT = "secondary.main";

/** One compact horizontal card per table (grouping every open round of
 *  that table's tab — see groupSessionsForDisplay) or per Counter bill.
 *  The info area links to the entry's detail page ([entryKey]/page.tsx)
 *  where the rounds, items and Accept/Reject live; the Paid button sits
 *  beside it, never inside the link. */
function EntryCard({
  entry,
  effect,
  onEffectEnd,
}: {
  entry: OrderEntry;
  effect?: CardEffect;
  onEffectEnd: (entryKey: string) => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  const SourceIcon = entry.isTableGroup ? TableRestaurantIcon : StorefrontIcon;
  const sourceAccent = entry.isTableGroup ? TABLE_ACCENT : COUNTER_ACCENT;
  const sourceLabel = entry.isTableGroup ? "Table" : "Counter";

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
      // Only the Badge root's own animation ends the cue — animationend
      // also bubbles up from children (e.g. the tap ripple).
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) onEffectEnd(entry.key);
      }}
      sx={{
        display: "block",
        ...(effect === "appear" && {
          animation: `${cardAppear} ${APPEAR_MS}ms ease-out`,
        }),
      }}
    >
      <Card
        variant="outlined"
        // A pseudo-element's animationend fires on its owner (the Card).
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget) onEffectEnd(entry.key);
        }}
        sx={{
          display: "flex",
          alignItems: "stretch",
          position: "relative",
          borderColor: entry.hasPendingApproval ? "error.main" : "divider",
          borderLeftWidth: 4,
          borderLeftColor: sourceAccent,
          transition: "box-shadow 160ms ease-out",
          [hoverCapableMedia]: { "&:hover": { boxShadow: 2 } },
          ...(effect === "highlight" && {
            "&::after": {
              content: '""',
              position: "absolute",
              inset: 0,
              borderRadius: "inherit",
              pointerEvents: "none",
              backgroundColor: "warning.main",
              opacity: 0,
              animation: `${highlightFade} ${HIGHLIGHT_MS}ms ease-out`,
            },
          }),
        }}
      >
        <CardActionArea
          component={Link}
          href={`/backoffice/order/${entry.key}`}
          sx={{ flex: "1 1 0", width: "auto", minWidth: 0, p: 1.5 }}
        >
          <Stack spacing={0.5}>
            <Stack
              direction="row"
              useFlexGap
              sx={{ alignItems: "center", columnGap: 1, rowGap: 0.5, flexWrap: "wrap" }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", minWidth: 0 }}
              >
                <SourceIcon
                  fontSize="medium"
                  sx={{ color: sourceAccent, flexShrink: 0 }}
                />
                <Typography variant="body1" noWrap sx={{ fontWeight: 700 }}>
                  {entry.title}
                </Typography>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                {sourceLabel}
              </Typography>
              {entry.sessions.length > 1 && (
                <Chip
                  label={`${entry.sessions.length} rounds`}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>

            {entry.hasPendingApproval && (
              <Stack
                direction="row"
                spacing={0.5}
                sx={{ alignItems: "center", color: "warning.dark" }}
              >
                <WarningAmberIcon fontSize="small" />
                <Typography
                  component="span"
                  variant="body2"
                  sx={{ fontWeight: 700 }}
                >
                  Needs approval
                </Typography>
                {entry.earliestApprovalExpiresAt && (
                  <>
                    <Typography component="span" variant="body2" aria-hidden>
                      ·
                    </Typography>
                    <ApprovalCountdown expiresAt={entry.earliestApprovalExpiresAt} />
                  </>
                )}
              </Stack>
            )}

            <Box sx={{ minHeight: 44, display: "flex", alignItems: "center" }}>
              <Typography variant="body1" sx={{ fontWeight: 800 }}>
                {entry.combinedTotal.toLocaleString()} MMK
              </Typography>
            </Box>
          </Stack>
        </CardActionArea>

        {/* Outside the link — a button nested in an anchor is invalid
           HTML and breaks keyboard/screen-reader use. The padding keeps
           it clear of the tappable info area. */}
        <Box sx={{ display: "flex", alignItems: "flex-end", p: 1.5, pl: 1 }}>
          <Button
            variant="contained"
            color="success"
            aria-label={`Paid: ${entry.title}`}
            disabled={isPending || entry.hasPendingApproval}
            onClick={() => setIsConfirmOpen(true)}
            sx={{ minHeight: 44, minWidth: 72 }}
          >
            Paid
          </Button>
        </Box>
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

/** Table or Counter column: its own heading and its own empty state. */
function SourceSection({
  headingId,
  label,
  icon,
  accent,
  entries,
  emptyText,
  effects,
  onEffectEnd,
}: {
  headingId: string;
  label: string;
  icon: React.ReactNode;
  accent: string;
  entries: OrderEntry[];
  emptyText: string;
  effects: Record<string, CardEffect>;
  onEffectEnd: (entryKey: string) => void;
}) {
  return (
    <Box component="section" aria-labelledby={headingId}>
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "center", mb: 1.5, color: accent }}
      >
        {icon}
        <Typography
          id={headingId}
          component="h2"
          variant="body1"
          sx={{ fontWeight: 800, color: "text.primary" }}
        >
          {label} ({entries.length})
        </Typography>
      </Stack>
      {entries.length === 0 ? (
        <Typography variant="body2" color="text.secondary">
          {emptyText}
        </Typography>
      ) : (
        <Stack spacing={1.5}>
          {entries.map((entry) => (
            <EntryCard
              key={entry.key}
              entry={entry}
              effect={effects[entry.key]}
              onEffectEnd={onEffectEnd}
            />
          ))}
        </Stack>
      )}
    </Box>
  );
}

export default function OrderListView({ entries }: OrderListViewProps) {
  // So a newly submitted table/counter order shows up (and the
  // countdowns stay honest) without the cashier reloading.
  useAutoRefresh();

  const [filter, setFilter] = useState<SourceFilter>("all");
  const [cardEffects, setCardEffects] = useState<Record<string, CardEffect>>(
    {},
  );
  const [notice, setNotice] = useState<NewOrderNotice | null>(null);
  const [isNoticeOpen, setIsNoticeOpen] = useState(false);
  const sound = useOrderAlertSound();

  // Fires once per refresh that brought new rounds needing approval
  // (never for what was already waiting when the page opened): cue the
  // cards, show ONE toast, beep ONCE.
  useNewPendingRounds(entries, (event: NewPendingRoundsEvent) => {
    setCardEffects((current) => ({
      ...current,
      ...Object.fromEntries(
        event.entries.map((arrived) => [
          arrived.key,
          arrived.isNewEntry ? "appear" : "highlight",
        ]),
      ),
    }));
    setNotice({ id: Date.now(), ...describeNewRounds(event) });
    setIsNoticeOpen(true);
    void sound.play();
  });

  function clearCardEffect(entryKey: string) {
    setCardEffects((current) => {
      if (!(entryKey in current)) return current;
      return Object.fromEntries(
        Object.entries(current).filter(([key]) => key !== entryKey),
      );
    });
  }

  // Tab title carries the count so it's visible from another tab.
  const pendingRoundCount = entries.reduce(
    (total, entry) =>
      total +
      entry.sessions.filter((session) => session.status === "PENDING_APPROVAL")
        .length,
    0,
  );
  useDocumentTitle(
    pendingRoundCount > 0 ? `(${pendingRoundCount}) Orders` : "Orders",
  );

  // Every entry lands in exactly one of these three lists — awaiting
  // approval wins over source, so nothing is ever shown twice.
  const needsApproval = entries.filter((entry) => entry.hasPendingApproval);
  const tableEntries = entries.filter(
    (entry) => !entry.hasPendingApproval && entry.isTableGroup,
  );
  const counterEntries = entries.filter(
    (entry) => !entry.hasPendingApproval && !entry.isTableGroup,
  );

  // Chip counts are per source across ALL open entries (including ones
  // shown under "Needs approval") — the total open for that source.
  const tableCount = entries.filter((entry) => entry.isTableGroup).length;
  const counterCount = entries.length - tableCount;
  const filters: { value: SourceFilter; label: string; count: number }[] = [
    { value: "all", label: "All", count: entries.length },
    { value: "table", label: "Tables", count: tableCount },
    { value: "counter", label: "Counter", count: counterCount },
  ];

  return (
    <Box sx={{ p: { xs: 1.5, sm: 2, md: 3 } }}>
      <Stack
        direction="row"
        useFlexGap
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 1.5,
          mb: 2,
        }}
      >
        <Typography component="h1" variant="h6">
          Orders
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          {entries.length > 0 && (
            <Stack
              direction="row"
              spacing={1}
              role="group"
              aria-label="Filter orders by source"
            >
              {filters.map(({ value, label, count }) => {
                const selected = filter === value;
                return (
                  <Chip
                    key={value}
                    label={`${label} (${count})`}
                    clickable
                    aria-pressed={selected}
                    color={selected ? "primary" : "default"}
                    variant={selected ? "filled" : "outlined"}
                    onClick={() => setFilter(value)}
                  />
                );
              })}
            </Stack>
          )}
          <OrderSoundToggle
            enabled={sound.enabled}
            isLocked={sound.isLocked}
            onToggle={sound.toggle}
          />
        </Stack>
      </Stack>

      {entries.length === 0 ? (
        <Typography variant="caption" color="text.secondary">
          Nothing open right now.
        </Typography>
      ) : (
        <>
          {needsApproval.length > 0 && (
            <Box
              component="section"
              aria-labelledby="needs-approval-heading"
              sx={{ mb: 3 }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", mb: 1.5, color: "warning.dark" }}
              >
                <WarningAmberIcon />
                <Typography
                  id="needs-approval-heading"
                  component="h2"
                  variant="body1"
                  sx={{ fontWeight: 800, color: "text.primary" }}
                >
                  Needs approval ({needsApproval.length})
                </Typography>
              </Stack>
              <Grid container spacing={1.5}>
                {needsApproval.map((entry) => (
                  <Grid key={entry.key} size={{ xs: 12, md: 6, xl: 4 }}>
                    <EntryCard
                      entry={entry}
                      effect={cardEffects[entry.key]}
                      onEffectEnd={clearCardEffect}
                    />
                  </Grid>
                ))}
              </Grid>
            </Box>
          )}

          <Grid container spacing={{ xs: 2, md: 3 }}>
            {filter !== "counter" && (
              <Grid size={{ xs: 12, md: 6 }}>
                <SourceSection
                  headingId="tables-heading"
                  label="Tables"
                  icon={<TableRestaurantIcon />}
                  accent={TABLE_ACCENT}
                  entries={tableEntries}
                  emptyText="No open table orders"
                  effects={cardEffects}
                  onEffectEnd={clearCardEffect}
                />
              </Grid>
            )}
            {filter !== "table" && (
              <Grid size={{ xs: 12, md: 6 }}>
                <SourceSection
                  headingId="counter-heading"
                  label="Counter"
                  icon={<StorefrontIcon />}
                  accent={COUNTER_ACCENT}
                  entries={counterEntries}
                  emptyText="No open counter orders"
                  effects={cardEffects}
                  onEffectEnd={clearCardEffect}
                />
              </Grid>
            )}
          </Grid>
        </>
      )}

      <NewOrderToast
        notice={notice}
        open={isNoticeOpen}
        onClose={() => setIsNoticeOpen(false)}
      />
    </Box>
  );
}
