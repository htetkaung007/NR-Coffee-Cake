"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import HourglassEmptyIcon from "@mui/icons-material/HourglassEmpty";
import { formatAmount } from "@/app/lib/orderFormat";

/**
 * Below lg (no side panel): the total to pay, any amount still waiting
 * approval, and "View bill" — pinned to the bottom of the viewport.
 *
 * Sticky at the end of the page's content column rather than
 * position: fixed — it then stays within the content area (never over
 * the permanent sidebar from sm up) and takes up its own space in the
 * flow, so it can never cover the last round card. Bottom padding
 * clears the home indicator (safe-area-inset-bottom).
 */
export default function BillBottomBar({
  total,
  pendingAmount,
  onViewBill,
}: {
  total: number;
  pendingAmount: number;
  onViewBill: () => void;
}) {
  return (
    <Box
      sx={(theme) => ({
        display: { xs: "flex", lg: "none" },
        alignItems: "center",
        gap: 2,
        position: "sticky",
        bottom: 0,
        zIndex: theme.zIndex.appBar,
        mt: 2,
        px: 2,
        pt: 1,
        pb: `calc(${theme.spacing(1)} + env(safe-area-inset-bottom, 0px))`,
        bgcolor: "background.default",
        borderTop: 1,
        borderColor: "divider",
      })}
    >
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body2" color="text.secondary">
          Total to pay
        </Typography>
        <Typography component="p" variant="h5">
          {formatAmount(total)}
        </Typography>
        {pendingAmount > 0 && (
          <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
            <HourglassEmptyIcon
              fontSize="small"
              aria-hidden
              sx={{ color: "warning.main" }}
            />
            <Typography variant="body2" color="text.secondary">
              +{formatAmount(pendingAmount)} waiting approval
            </Typography>
          </Stack>
        )}
      </Box>
      <Button
        variant="contained"
        color="primary"
        onClick={onViewBill}
        sx={{ minHeight: 44, flexShrink: 0 }}
      >
        View bill
      </Button>
    </Box>
  );
}
