import { Box, Stack, Typography } from "@mui/material";
import type { BreakdownRow } from "@/app/lib/order/orderTotals";
import { formatAmount } from "@/app/lib/orderFormat";

/** "Latte ×2" for the item; "+ Extra shot" (or "+ Extra shot ×2" when
 *  the line is for more than one) for an add-on. */
function rowLabel(row: BreakdownRow) {
  if (row.kind === "item") return `${row.name} ×${row.quantity}`;
  return row.quantity > 1 ? `+ ${row.name} ×${row.quantity}` : `+ ${row.name}`;
}

const amountSx = {
  flexShrink: 0,
  textAlign: "right",
  fontVariantNumeric: "tabular-nums",
} as const;

interface BillLineRowsProps {
  /** lineBreakdown's rows: the item, then one per add-on. */
  rows: BreakdownRow[];
  /** "regular" for the Backoffice bill (body1 / body2); "compact" for
   *  the thermal receipt (body2 / caption). */
  density?: "regular" | "compact";
  /** Paper: add-ons stay black like everything else on a receipt (no
   *  greys), instead of text.secondary. */
  print?: boolean;
  /** Extra style for the item's amount (e.g. the staff panel's bold). */
  itemAmountSx?: object;
}

/**
 * ONE bill line, itemised: "Moat Hnin ×1 … 3,000", then an indented row
 * per add-on "+ Default Addon1 … 300" in a smaller, muted style. The
 * right-hand amounts are the line's parts and add up to its lineTotal
 * (lineBreakdown), so a bill's amounts add up to its total. The one
 * place this markup lives — the order detail's bill (desktop panel,
 * tablet drawer, phone sheet), Order History's detail, the staff New
 * Order panel and the printed receipts all render lines through it.
 * Money stays neutral (never red).
 */
export default function BillLineRows({
  rows,
  density = "regular",
  print = false,
  itemAmountSx,
}: BillLineRowsProps) {
  const itemVariant = density === "regular" ? "body1" : "body2";
  const addonVariant = density === "regular" ? "body2" : "caption";
  const addonColor = print ? "inherit" : "text.secondary";

  return (
    <Box>
      {rows.map((row, index) => {
        const isItem = row.kind === "item";
        const variant = isItem ? itemVariant : addonVariant;
        return (
          <Stack
            key={`${row.kind}-${index}`}
            direction="row"
            spacing={density === "regular" ? 2 : 1}
            sx={{
              justifyContent: "space-between",
              alignItems: "baseline",
              pl: isItem ? 0 : 2,
              color: isItem ? undefined : addonColor,
            }}
          >
            <Typography
              variant={variant}
              component="span"
              sx={{ minWidth: 0, overflowWrap: "anywhere" }}
            >
              {rowLabel(row)}
            </Typography>
            <Typography
              variant={variant}
              component="span"
              sx={{ ...amountSx, ...(isItem && itemAmountSx) }}
            >
              {formatAmount(row.amount)}
            </Typography>
          </Stack>
        );
      })}
    </Box>
  );
}
