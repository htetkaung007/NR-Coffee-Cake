"use client";

import { Box, Card, Chip, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import type { CategoryItem } from "./SortableCategoryRow";

/** Mirrors MenuBrowser's synthetic first tab — the one the customer menu
 *  opens on (MenuBrowser's initial activeCategory). */
const ALL_TAB = "All";

/** One row of tab chips, in the list's live order. The real customer
 *  menu gives an empty category no tab; here it keeps its place as a
 *  dimmed, dashed chip so a new category doesn't look missing. */
function TabChips({
  categories,
  compact,
}: {
  categories: CategoryItem[];
  compact: boolean;
}) {
  const chipSize = compact ? "small" : "medium";
  return (
    <Stack
      component="ul"
      aria-label="Category tabs as customers see them"
      direction="row"
      useFlexGap
      sx={{
        listStyle: "none",
        m: 0,
        p: 0,
        gap: 1,
        ...(compact
          ? {
              // Phones: one row that scrolls sideways inside the card; it
              // bleeds to the card's right edge so the last chip is cut
              // off there — the hint that it scrolls. Scrollbar hidden.
              flexWrap: "nowrap",
              overflowX: "auto",
              mr: -2.5,
              pr: 2.5,
              scrollbarWidth: "none",
              "&::-webkit-scrollbar": { display: "none" },
            }
          : { flexWrap: "wrap" }),
      }}
    >
      <Chip
        component="li"
        size={chipSize}
        color="primary"
        aria-label={`${ALL_TAB} (opens first)`}
        label={
          <Typography variant="body2" component="span">
            {ALL_TAB}
          </Typography>
        }
        sx={{ flexShrink: 0 }}
      />
      {categories.map((category) =>
        category.itemCount > 0 ? (
          <Chip
            component="li"
            key={category.id}
            size={chipSize}
            variant="outlined"
            label={
              <Typography variant="body2" component="span">
                {category.name}
              </Typography>
            }
            sx={{ flexShrink: 0 }}
          />
        ) : (
          <Chip
            component="li"
            key={category.id}
            size={chipSize}
            variant="outlined"
            aria-label={`${category.name} — not shown to customers yet (no items)`}
            label={
              <Typography variant="body2" component="span">
                {category.name}
              </Typography>
            }
            sx={{
              flexShrink: 0,
              color: "text.disabled",
              borderStyle: "dashed",
              borderColor: "divider",
              bgcolor: "transparent",
            }}
          />
        ),
      )}
    </Stack>
  );
}

/**
 * A picture of the customer menu's category bar for THIS location, drawn
 * from the list's own (optimistic) order, so it moves with every drag,
 * ↑ / ↓ or Sort A → Z — and moves back on a rollback.
 *
 * compact (phones): label above a small card — shop name, "Table · Dine
 * in", one sideways-scrolling row of small chips; no tiles, no note.
 * full (md+): the same card with small placeholder tiles and a short
 * note. Only the chip list is exposed to screen readers; the tiles are
 * decorative.
 */
export default function CategoryTabsPreview({
  shopName,
  categories,
  variant,
}: {
  shopName: string | null;
  categories: CategoryItem[];
  variant: "compact" | "full";
}) {
  const compact = variant === "compact";
  const hasEmptyCategories = categories.some(
    (category) => category.itemCount === 0,
  );

  const label = (
    <Typography
      variant="caption"
      component="p"
      color="text.secondary"
      sx={{ textTransform: "uppercase", mb: compact ? 1 : 0 }}
    >
      Customer menu preview
    </Typography>
  );

  return (
    <Box>
      {compact && label}
      <Card variant="outlined" sx={{ p: compact ? 2.5 : 2 }}>
        {!compact && label}
        <Typography variant="body1" component="p" noWrap>
          {shopName ?? "Your shop"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Table · Dine in
        </Typography>

        <Box sx={{ mt: 2 }}>
          <TabChips categories={categories} compact={compact} />
        </Box>

        {!compact && (
          <>
            <Box
              aria-hidden
              sx={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: 1,
                mt: 2,
              }}
            >
              {[0, 1, 2, 3].map((tile) => (
                <Box
                  key={tile}
                  sx={(theme) => ({
                    height: 72,
                    p: 1,
                    display: "flex",
                    alignItems: "flex-end",
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.text.primary, 0.04),
                  })}
                >
                  <Box
                    sx={(theme) => ({
                      height: 8,
                      width: "60%",
                      borderRadius: 1,
                      bgcolor: alpha(theme.palette.text.primary, 0.1),
                    })}
                  />
                </Box>
              ))}
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              “All” opens first; the tabs follow this order — on the staff order
              screen too.
              {hasEmptyCategories &&
                " Categories without items stay hidden from customers until you add one."}
            </Typography>
          </>
        )}
      </Card>
    </Box>
  );
}
