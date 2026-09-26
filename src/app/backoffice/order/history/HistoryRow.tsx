"use client";

import Link from "next/link";
import { Box, Chip, Stack, Typography } from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TableRestaurantIcon from "@mui/icons-material/TableRestaurant";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";
import { countLabel, formatAmount, formatClockTime } from "@/app/lib/orderFormat";
import {
  formatCancelReasonLabel,
  formatTimeRange,
} from "./historyFormat";
import type { CancelledRoundListItem, PaidBillListItem } from "./action";

const BADGE_SIZE = 40;

/** A short digit label pulled from the table's own name ("Table 5" →
 *  "5") for the row's square badge — falls back to a generic table
 *  icon when the name has no number to show (an unusual staff-typed
 *  name), never guessed text. */
function TableBadgeContent({ title }: { title: string }) {
  const match = /\d+/.exec(title);
  if (match) {
    return (
      <Typography variant="body1" sx={{ fontWeight: 800 }}>
        {match[0]}
      </Typography>
    );
  }
  return <TableRestaurantIcon fontSize="small" />;
}

function RowBadge({
  title,
  isCounter,
}: {
  title: string;
  isCounter: boolean;
}) {
  return (
    <Box
      aria-hidden
      sx={{
        flexShrink: 0,
        width: BADGE_SIZE,
        height: BADGE_SIZE,
        borderRadius: 1.5,
        border: 1,
        borderColor: "divider",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: isCounter ? "secondary.main" : "info.main",
        bgcolor: "background.default",
      }}
    >
      {isCounter ? (
        <StorefrontIcon fontSize="small" />
      ) : (
        <TableBadgeContent title={title} />
      )}
    </Box>
  );
}

interface RowShellProps {
  href: string;
  onSelect: () => void;
  selected: boolean;
  badge: React.ReactNode;
  title: string;
  secondaryLine: React.ReactNode;
  amount: number;
}

/** The one row shell both tabs share — a whole-row link (Rule 10's
 *  whole-card pattern: one semantic link, no nested interactive
 *  elements), ≥44px, with a visible selected style for the lg+ master-
 *  detail layout (border + aria-current). */
function RowShell({
  href,
  onSelect,
  selected,
  badge,
  title,
  secondaryLine,
  amount,
}: RowShellProps) {
  return (
    <Box
      component={Link}
      href={href}
      onClick={(event) => {
        event.preventDefault();
        onSelect();
      }}
      aria-current={selected ? "true" : undefined}
      sx={(theme) => ({
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        minHeight: 44,
        px: { xs: 1.5, sm: 2 },
        py: 1.5,
        textDecoration: "none",
        color: "inherit",
        borderRadius: 2,
        border: 1,
        borderColor: selected ? "primary.main" : "divider",
        borderWidth: selected ? 2 : 1,
        // Compensates for the thicker selected border so a row's box
        // size (and its neighbours' spacing) never shifts on select.
        m: selected ? 0 : "1px",
        transition: "border-color 160ms ease-out, background-color 160ms ease-out",
        [hoverCapableMedia]: {
          "&:hover": {
            backgroundColor: selected
              ? "transparent"
              : theme.palette.action.hover,
          },
        },
      })}
    >
      {badge}
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body1" noWrap sx={{ fontWeight: 700 }}>
          {title}
        </Typography>
        <Box
          sx={{
            overflow: "hidden",
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
          }}
        >
          {secondaryLine}
        </Box>
      </Box>
      <Typography
        variant="body1"
        sx={{ flexShrink: 0, fontWeight: 700, color: "text.primary" }}
      >
        {formatAmount(amount)}
      </Typography>
      <ChevronRightIcon
        aria-hidden
        fontSize="small"
        sx={{ flexShrink: 0, color: "text.secondary" }}
      />
    </Box>
  );
}

export function PaidBillRow({
  item,
  href,
  onSelect,
  selected,
}: {
  item: PaidBillListItem;
  href: string;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <RowShell
      href={href}
      onSelect={onSelect}
      selected={selected}
      badge={<RowBadge title={item.title} isCounter={item.isCounter} />}
      title={item.title}
      amount={item.total}
      secondaryLine={
        <Typography
          component="span"
          variant="body2"
          color="text.secondary"
          suppressHydrationWarning
        >
          {formatTimeRange(item.openedAt, item.paidAt)} ·{" "}
          {countLabel(item.itemCount, "item", "items")} ·{" "}
          {item.orderNumbers.join(" ")}
        </Typography>
      }
    />
  );
}

export function CancelledRoundRow({
  item,
  href,
  onSelect,
  selected,
}: {
  item: CancelledRoundListItem;
  href: string;
  onSelect: () => void;
  selected: boolean;
}) {
  return (
    <RowShell
      href={href}
      onSelect={onSelect}
      selected={selected}
      badge={<RowBadge title={item.title} isCounter={item.isCounter} />}
      title={item.title}
      amount={item.amount}
      secondaryLine={
        <Stack
          component="span"
          direction="row"
          spacing={1}
          sx={{ display: "inline-flex", alignItems: "center" }}
        >
          <Typography
            component="span"
            variant="body2"
            color="text.secondary"
            suppressHydrationWarning
          >
            {formatClockTime(item.cancelledAt)} ·{" "}
            {countLabel(item.itemCount, "item", "items")} · {item.orderNumber}
          </Typography>
          <Chip
            size="small"
            variant="outlined"
            label={
              <Typography variant="caption" component="span">
                {formatCancelReasonLabel(item.reason)}
              </Typography>
            }
          />
        </Stack>
      }
    />
  );
}
