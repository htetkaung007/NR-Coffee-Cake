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
  Grid,
  Stack,
  Typography,
} from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TableRestaurantIcon from "@mui/icons-material/TableRestaurant";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import type { SvgIconComponent } from "@mui/icons-material";
import { keyframes } from "@mui/material/styles";
import { useAutoRefresh } from "@/app/lib/hooks/useAutoRefresh";
import { useDocumentTitle } from "@/app/lib/hooks/useDocumentTitle";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { canPrintBill } from "@/app/lib/orderTotals";
import {
  useFeedPendingFromList,
  useNewPendingRoundsListener,
  useOrderAlerts,
  type NewPendingRoundsEvent,
} from "../OrderAlertsProvider";
import { markEntryPaidAction } from "./action";
import ApprovalCountdown from "./ApprovalCountdown";
import MarkPaidDialog from "./MarkPaidDialog";
import PrintBillButton from "./PrintBillButton";
import NewOrderToast, {
  describeNewRounds,
  type NewOrderNotice,
} from "./NewOrderToast";
import OrderSoundToggle from "./OrderSoundToggle";
import OrderSectionNav from "./OrderSectionNav";

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
          // On a narrow card (e.g. 320px) the Print + Paid buttons wrap
          // under the info area instead of shrinking below 44px.
          flexWrap: "wrap",
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
          // 160px: below that the title and total get too cramped next
          // to the two buttons, so the buttons wrap to their own row.
          sx={{ flex: "1 1 160px", width: "auto", minWidth: 0, p: 1.5 }}
        >
          <Stack spacing={0.5}>
            <Stack
              direction="row"
              useFlexGap
              sx={{
                alignItems: "center",
                columnGap: 1,
                rowGap: 0.5,
                flexWrap: "wrap",
              }}
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
                    <ApprovalCountdown
                      expiresAt={entry.earliestApprovalExpiresAt}
                    />
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
           them clear of the tappable info area; ml: auto keeps them
           right-aligned when they've wrapped onto their own row. */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignSelf: "flex-end",
            alignItems: "center",
            ml: "auto",
            p: 1.5,
            pl: 1,
          }}
        >
          <PrintBillButton
            variant="icon"
            entryKey={entry.key}
            disabled={!canPrintBill(entry.sessions)}
          />
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
        </Stack>
      </Card>

      <MarkPaidDialog
        open={isConfirmOpen}
        title={entry.title}
        orderCount={entry.sessions.length}
        total={entry.combinedTotal}
        onCancel={() => setIsConfirmOpen(false)}
        onConfirm={handleMarkPaid}
      />
    </Badge>
  );
}

/** A section with nothing open: the section's own icon, muted, and the
 *  same two lines in every section. Just a message — nothing to tap.
 *  The first order into the section replaces it with its card (and
 *  that card's usual "appear" cue and toast). */
function SectionEmptyState({ Icon }: { Icon: SvgIconComponent }) {
  return (
    <Stack
      spacing={1}
      sx={{
        alignItems: "center",
        textAlign: "center",
        px: 2,
        py: 4,
        border: 1,
        borderStyle: "dashed",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Icon fontSize="large" sx={{ color: "text.secondary" }} />
      <Typography variant="body1">No orders yet</Typography>
      <Typography variant="body2" color="text.secondary">
        New orders appear here automatically.
      </Typography>
    </Stack>
  );
}

/** Table or Counter column: its own heading (always shown, even at 0)
 *  and its own empty state. */
function SourceSection({
  headingId,
  label,
  Icon,
  accent,
  entries,
  effects,
  onEffectEnd,
}: {
  headingId: string;
  label: string;
  Icon: SvgIconComponent;
  accent: string;
  entries: OrderEntry[];
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
        <Icon />
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
        <SectionEmptyState Icon={Icon} />
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
  const { sound } = useOrderAlerts();

  // Fires once per refresh that brought new rounds needing approval
  // (never for what was already waiting when the Backoffice opened):
  // cue the cards and show ONE toast. The beep and the tab-title count
  // are OrderAlertsProvider's — they work on every Backoffice page.
  useNewPendingRoundsListener((event: NewPendingRoundsEvent) => {
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
  });
  // After the listener above, so it's subscribed before the first feed.
  // This list's own refresh (useAutoRefresh) is the provider's data
  // source while mounted — the provider pauses its own poll.
  useFeedPendingFromList(entries);

  function clearCardEffect(entryKey: string) {
    setCardEffects((current) => {
      if (!(entryKey in current)) return current;
      return Object.fromEntries(
        Object.entries(current).filter(([key]) => key !== entryKey),
      );
    });
  }

  // The provider prefixes this with the pending count, e.g. "(2) Orders".
  useDocumentTitle("Orders");

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
        <Stack
          direction="row"
          useFlexGap
          sx={{ alignItems: "center", flexWrap: "wrap", gap: 1.5 }}
        >
          <Typography component="h1" variant="h6">
            Orders
          </Typography>
          <OrderSectionNav active="open" />
        </Stack>
        {/* Always shown — even with nothing open, the cashier can turn
            the sound on before the first order arrives. Wraps on narrow
            screens rather than overflowing. */}
        <Stack
          direction="row"
          useFlexGap
          sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
        >
          <Stack
            direction="row"
            useFlexGap
            role="group"
            aria-label="Filter orders by source"
            sx={{ flexWrap: "wrap", gap: 1 }}
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
          <OrderSoundToggle
            enabled={sound.enabled}
            isLocked={sound.isLocked}
            onToggle={sound.toggle}
            volume={sound.volume}
            onVolumeChange={sound.setVolume}
            onTestBeep={sound.playTest}
          />
        </Stack>
      </Stack>

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
              Icon={TableRestaurantIcon}
              accent={TABLE_ACCENT}
              entries={tableEntries}
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
              Icon={StorefrontIcon}
              accent={COUNTER_ACCENT}
              entries={counterEntries}
              effects={cardEffects}
              onEffectEnd={clearCardEffect}
            />
          </Grid>
        )}
      </Grid>

      <NewOrderToast
        notice={notice}
        open={isNoticeOpen}
        onClose={() => setIsNoticeOpen(false)}
      />
    </Box>
  );
}
