import { Box, Typography } from "@mui/material";

/**
 * The history list's total as ONE compact row at the top of the list —
 * it scrolls with the cards, so the bottom of the screen stays free for
 * them. Left: what it is ("Table total" / the bill number) and a short
 * detail line; right: the amount (never wraps). Plain markup, so the
 * server page renders it directly.
 */
export default function HistoryTotalCard({
  label,
  detail,
  amount,
}: {
  label: string;
  /** e.g. "3 orders · Your items: 4,500 Kyats". */
  detail: string;
  /** Already formatted in the customer's language. */
  amount: string;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 2,
        px: 2,
        py: 1.5,
        mb: { xs: 1.5, sm: 2 },
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
      }}
    >
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" sx={{ fontWeight: 700 }} noWrap>
          {label}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="p">
          {detail}
        </Typography>
      </Box>
      <Typography
        variant="subtitle1"
        component="p"
        sx={{ flexShrink: 0, whiteSpace: "nowrap", color: "primary.main" }}
      >
        {amount}
      </Typography>
    </Box>
  );
}
