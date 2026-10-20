import { Box, Stack, Typography } from "@mui/material";
import { useLocale } from "next-intl";
import { localizedText } from "@/app/lib/i18n/localizedText";
import type { BreakdownRow } from "@/app/lib/order/orderTotals";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";

/** "Latte ×2" for the item; "+ Extra shot" (or "+ Extra shot ×2" when
 *  the line is for more than one) for an add-on — the shop's Myanmar
 *  name in Myanmar where it gave one (row.nameMy, localizedText). */
function rowLabel(row: BreakdownRow, locale: string) {
  const name = localizedText(locale, row.name, row.nameMy);
  if (row.kind === "item") return `${name} ×${row.quantity}`;
  return row.quantity > 1 ? `+ ${name} ×${row.quantity}` : `+ ${name}`;
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
  /** How an amount reads — default: the staff's money words ("3,000
   *  MMK" / "3,000 ကျပ်", useStaffMoney); New Order's မြန်မာ view passes
   *  the customer's, the print preview its voucher language's. */
  formatMoney?: (amount: number) => string;
  /** Which language the names show in — default: the staff's own
   *  (BO_LOCALE); the print preview passes its voucher language. */
  locale?: string;
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
  formatMoney,
  locale,
}: BillLineRowsProps) {
  const money = useStaffMoney();
  const staffLocale = useLocale();
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
              {rowLabel(row, locale ?? staffLocale)}
            </Typography>
            <Typography
              variant={variant}
              component="span"
              sx={{ ...amountSx, ...(isItem && itemAmountSx) }}
            >
              {(formatMoney ?? money.amount)(row.amount)}
            </Typography>
          </Stack>
        );
      })}
    </Box>
  );
}
