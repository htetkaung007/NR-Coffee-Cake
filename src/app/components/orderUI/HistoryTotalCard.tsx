import { Box, Typography } from "@mui/material";

/**
 * The history list's total — ONE card at the END of the list, after the
 * last order card. It scrolls with the cards (never fixed); the page
 * keeps BOTTOM_BAR_CLEARANCE, so it never ends under the bottom bar.
 * Row 1: what it is (the bill number / "Table total") · the count; on a
 * table, the customer's own part under it; then "Total amount" with the
 * amount on the right in the customer price tone (palette.decor.price,
 * DESIGN.md §13), never wrapping. Plain markup, so the server page
 * renders it directly.
 */
export default function HistoryTotalCard({
  label,
  count,
  yourPart,
  totalLabel,
  amount,
}: {
  /** The bill number ("#A034") or the "Table total" words. */
  label: string;
  /** "3 rounds" / "2 orders". */
  count: string;
  /** Table only — "Your total so far: 4,500 Kyats". */
  yourPart?: string;
  /** "Total amount" in the customer's language. */
  totalLabel: string;
  /** Already formatted in the customer's language. */
  amount: string;
}) {
  return (
    <Box
      sx={{
        mt: { xs: 1.5, sm: 2 },
        px: 2,
        py: 1.5,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "baseline",
          columnGap: 1,
          minWidth: 0,
        }}
      >
        <Typography
          variant="body1"
          component="p"
          sx={{ fontWeight: 700, overflowWrap: "anywhere" }}
        >
          {label}
        </Typography>
        <Typography variant="body2" color="text.secondary" aria-hidden>
          ·
        </Typography>
        <Typography variant="body2" color="text.secondary" component="p">
          {count}
        </Typography>
      </Box>
      {yourPart && (
        <Typography variant="caption" color="text.secondary" component="p">
          {yourPart}
        </Typography>
      )}
      <Box
        sx={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          gap: 2,
          mt: 1,
          pt: 1,
          borderTop: "1px solid",
          borderColor: "divider",
        }}
      >
        <Typography
          variant="body2"
          component="p"
          sx={{ minWidth: 0, overflowWrap: "anywhere" }}
        >
          {totalLabel}
        </Typography>
        <Typography
          variant="subtitle1"
          component="p"
          sx={{
            flexShrink: 0,
            fontWeight: 700,
            whiteSpace: "nowrap",
            color: "decor.price",
          }}
        >
          {amount}
        </Typography>
      </Box>
    </Box>
  );
}
