"use client";

import { Box, Button, IconButton, Tooltip } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

/** What to print: an open Order List entry's bill, or a paid bill's
 *  receipt (reprinted from Order History). */
type PrintTarget = { entryKey: string } | { billId: number };

function printUrlFor(target: PrintTarget) {
  return "billId" in target
    ? `/print/bill/${target.billId}`
    : `/print/order/${encodeURIComponent(target.entryKey)}`;
}

/** Opens the printable receipt, which prints itself and closes
 *  afterwards. Called straight from the click (a user gesture, so it
 *  isn't popup-blocked); if a blocker still refuses, it opens in this
 *  tab instead. Never touches payment. */
function openPrintable(target: PrintTarget) {
  const printUrl = printUrlFor(target);
  const printWindow = window.open(printUrl, "_blank");
  if (!printWindow) window.location.assign(printUrl);
}

type PrintBillButtonProps = PrintTarget & {
  /** From canPrintBill — true while nothing has been accepted yet. A
   *  paid bill always has something to print. */
  disabled?: boolean;
  /** "full": outlined button with text (the bill); "icon": compact
   *  icon button with a tooltip (an Order List card). */
  variant: "full" | "icon";
  /** Full variant: id of the caller's reason text shown while disabled. */
  reasonId?: string;
}

/**
 * "Print bill" (an open entry) / "Print receipt" (a paid bill) — the one
 * component behind the bill's button, the Order List card's icon and
 * History's paid-bill detail, so all of them open the receipt the same
 * way. Both variants are secondary in weight (outlined, neutral color):
 * Mark as paid / Paid stays the primary action. 44px hit area either way.
 */
export default function PrintBillButton({
  disabled = false,
  variant,
  reasonId,
  ...target
}: PrintBillButtonProps) {
  const label = "billId" in target ? "Print receipt" : "Print bill";

  if (variant === "full") {
    return (
      <Button
        fullWidth
        variant="outlined"
        color="inherit"
        startIcon={<PrintIcon />}
        disabled={disabled}
        aria-describedby={disabled ? reasonId : undefined}
        onClick={() => openPrintable(target)}
        sx={{ minHeight: 44 }}
      >
        {label}
      </Button>
    );
  }

  return (
    <Tooltip title={disabled ? "Nothing to print yet" : label}>
      {/* A disabled button fires no pointer events, so the Tooltip
          listens on this wrapper instead (MUI's disabled-tooltip
          guidance). */}
      <Box component="span" sx={{ display: "inline-flex" }}>
        <IconButton
          aria-label={label}
          disabled={disabled}
          onClick={() => openPrintable(target)}
          sx={{
            width: 44,
            height: 44,
            borderRadius: 1,
            border: 1,
            borderColor: "divider",
            color: "text.primary",
            [hoverCapableMedia]: {
              "&:hover": { borderColor: "text.primary" },
            },
          }}
        >
          <PrintIcon fontSize="small" />
        </IconButton>
      </Box>
    </Tooltip>
  );
}
