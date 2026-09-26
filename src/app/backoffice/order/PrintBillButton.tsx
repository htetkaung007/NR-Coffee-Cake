"use client";

import { Box, Button, IconButton, Tooltip } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import { hoverCapableMedia } from "@/app/lib/theme/sharedThemeTokens";

/** Opens the entry's printable bill (/print/order/[entryKey]), which
 *  prints itself and closes afterwards. Called straight from the click
 *  (a user gesture, so it isn't popup-blocked); if a blocker still
 *  refuses, it opens in this tab instead. Never touches payment. */
function openPrintableBill(entryKey: string) {
  const printUrl = `/print/order/${encodeURIComponent(entryKey)}`;
  const printWindow = window.open(printUrl, "_blank");
  if (!printWindow) window.location.assign(printUrl);
}

interface PrintBillButtonProps {
  entryKey: string;
  /** From canPrintBill — true while nothing has been accepted yet. */
  disabled: boolean;
  /** "full": outlined button with text (the bill); "icon": compact
   *  icon button with a tooltip (an Order List card). */
  variant: "full" | "icon";
  /** Full variant: id of the caller's reason text shown while disabled. */
  reasonId?: string;
}

/**
 * "Print bill" — the one component behind the bill's button and the
 * Order List card's icon, so both open the receipt the same way. Both
 * variants are secondary in weight (outlined, neutral color): Mark as
 * paid / Paid stays the primary action. 44px hit area either way.
 */
export default function PrintBillButton({
  entryKey,
  disabled,
  variant,
  reasonId,
}: PrintBillButtonProps) {
  if (variant === "full") {
    return (
      <Button
        fullWidth
        variant="outlined"
        color="inherit"
        startIcon={<PrintIcon />}
        disabled={disabled}
        aria-describedby={disabled ? reasonId : undefined}
        onClick={() => openPrintableBill(entryKey)}
        sx={{ minHeight: 44 }}
      >
        Print bill
      </Button>
    );
  }

  return (
    <Tooltip title={disabled ? "Nothing to print yet" : "Print bill"}>
      {/* A disabled button fires no pointer events, so the Tooltip
          listens on this wrapper instead (MUI's disabled-tooltip
          guidance). */}
      <Box component="span" sx={{ display: "inline-flex" }}>
        <IconButton
          aria-label="Print bill"
          disabled={disabled}
          onClick={() => openPrintableBill(entryKey)}
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
