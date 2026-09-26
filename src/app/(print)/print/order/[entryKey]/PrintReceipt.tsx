"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Box, Button, GlobalStyles, Stack, Typography } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import type { EntryBill } from "@/app/lib/orderTotals";
import {
  countLabel,
  formatAmount,
  formatClockTime,
} from "@/app/lib/orderFormat";

// Receipt roll width — the ONE value to change for another printer
// (e.g. 58 for a 58mm roll). Content width follows from it.
const PAPER_WIDTH_MM = 80;
// Blank edge kept on each side: 80mm paper → 72mm of content.
const SIDE_MARGIN_MM = 4;
// CSS pixels are defined as 1/96 inch; 25.4mm per inch.
const MM_PER_CSS_PX = 25.4 / 96;

// Times and the print date are rendered in the browser only: the
// server's timezone can differ from the till's, and a printed receipt
// must show local time (hydration would otherwise keep the server's).
const subscribeNever = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

interface PrintReceiptProps {
  entryKey: string;
  shopName: string;
  locationName: string | null;
  /** Table name or Counter bill number. */
  title: string;
  bill: EntryBill;
}

/** Dashed rule between receipt sections. */
function Rule() {
  return (
    <Box
      aria-hidden
      sx={{ my: 1, borderTop: "1px dashed", borderColor: "common.black" }}
    />
  );
}

/**
 * The bill on thermal-receipt paper: accepted rounds line by line, the
 * total, "BILL — NOT PAID" (printing never settles anything — Mark as
 * paid does). Black on white whatever the app's light/dark mode, no
 * tints, shadows, rounded corners or images.
 *
 * Prints itself once, after rendering and after web fonts load. The
 * page is exactly as long as the receipt: `@page { size: 80mm auto }`
 * isn't valid CSS (size takes one or two lengths, and browsers drop the
 * whole rule), so the receipt's rendered height is measured and used
 * as the page height instead. After printing, a tab opened by the
 * detail page's "Print bill" button (window.opener) closes itself.
 */
export default function PrintReceipt({
  entryKey,
  shopName,
  locationName,
  title,
  bill,
}: PrintReceiptProps) {
  const isClient = useIsClient();
  const [printedAt] = useState(() => new Date());
  const receiptRef = useRef<HTMLDivElement>(null);
  const [pageHeightMm, setPageHeightMm] = useState<number | null>(null);
  const hasPrinted = useRef(false);

  useEffect(() => {
    if (!isClient) return;
    let isCurrent = true;
    void document.fonts.ready.then(() => {
      if (!isCurrent || !receiptRef.current) return;
      const heightPx = receiptRef.current.getBoundingClientRect().height;
      setPageHeightMm(Math.ceil(heightPx * MM_PER_CSS_PX));
    });
    return () => {
      isCurrent = false;
    };
  }, [isClient]);

  // Once, after the page size is known (the ref also covers StrictMode
  // re-running effects in development).
  useEffect(() => {
    if (pageHeightMm === null || hasPrinted.current) return;
    hasPrinted.current = true;
    window.print();
  }, [pageHeightMm]);

  useEffect(() => {
    function closeIfOpenedByButton() {
      if (window.opener) window.close();
    }
    window.addEventListener("afterprint", closeIfOpenedByButton);
    return () =>
      window.removeEventListener("afterprint", closeIfOpenedByButton);
  }, []);

  const pendingCount = bill.pendingRounds.length;

  return (
    <>
      <GlobalStyles
        styles={(theme) => ({
          "@page": {
            margin: 0,
            ...(pageHeightMm !== null && {
              size: `${PAPER_WIDTH_MM}mm ${pageHeightMm}mm`,
            }),
          },
          "@media print": {
            "html, body": {
              margin: 0,
              backgroundColor: theme.palette.common.white,
              color: theme.palette.common.black,
            },
          },
        })}
      />

      {/* Screen only: print again or go back (e.g. when the tab wasn't
          opened by the button and so doesn't close itself). */}
      <Stack
        direction="row"
        spacing={1}
        sx={{ justifyContent: "center", p: 2, displayPrint: "none" }}
      >
        <Button
          component={Link}
          href={`/backoffice/order/${entryKey}`}
          variant="outlined"
          color="inherit"
          sx={{ minHeight: 44 }}
        >
          Back to order
        </Button>
        <Button
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
          sx={{ minHeight: 44 }}
        >
          Print
        </Button>
      </Stack>

      <Box
        ref={receiptRef}
        sx={{
          width: `${PAPER_WIDTH_MM}mm`,
          boxSizing: "border-box",
          mx: "auto",
          px: `${SIDE_MARGIN_MM}mm`,
          py: 2,
          color: "common.black",
          bgcolor: "common.white",
          // A paper outline on screen only.
          outline: "1px solid",
          outlineColor: "divider",
          "@media print": { mx: 0, outline: "none" },
        }}
      >
        <Typography component="h1" variant="h6" align="center">
          {shopName}
        </Typography>
        {locationName && (
          <Typography variant="body2" align="center">
            {locationName}
          </Typography>
        )}
        <Typography variant="body1" align="center">
          {title}
        </Typography>
        <Typography variant="caption" component="p" align="center">
          {isClient &&
            printedAt.toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}
        </Typography>

        <Rule />

        {bill.acceptedRounds.length === 0 && (
          <Typography variant="body2">No accepted orders yet.</Typography>
        )}
        {bill.acceptedRounds.map((round) => (
          <Box key={round.orderNumber} component="section" sx={{ mb: 1 }}>
            <Typography
              component="h2"
              variant="overline"
              sx={{ display: "block" }}
            >
              Order {round.orderNumber}
              {isClient && ` · ${formatClockTime(round.time)}`}
            </Typography>
            {round.lines.map((line) => (
              <Stack
                key={line.id}
                direction="row"
                spacing={1}
                sx={{ justifyContent: "space-between" }}
              >
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="body2">
                    {line.name} ×{line.qty}
                  </Typography>
                  {line.addonSummary && (
                    <Typography variant="caption" component="p">
                      {line.addonSummary}
                    </Typography>
                  )}
                </Box>
                <Typography variant="body2" sx={{ flexShrink: 0 }}>
                  {formatAmount(line.lineTotal)}
                </Typography>
              </Stack>
            ))}
          </Box>
        ))}

        <Rule />

        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: "space-between", alignItems: "baseline" }}
        >
          <Typography variant="body1">Total</Typography>
          <Typography component="p" variant="h5">
            {formatAmount(bill.total)}
          </Typography>
        </Stack>
        {pendingCount > 0 && (
          <Typography variant="caption" component="p">
            {countLabel(pendingCount, "pending order", "pending orders")} not
            included
          </Typography>
        )}

        <Rule />

        <Typography variant="overline" component="p" align="center">
          BILL — NOT PAID
        </Typography>
        <Typography variant="body2" align="center">
          Thank you
        </Typography>
      </Box>
    </>
  );
}
