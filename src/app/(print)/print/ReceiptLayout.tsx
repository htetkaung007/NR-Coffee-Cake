"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  NextIntlClientProvider,
  useFormatter,
  useLocale,
  useNow,
  useTimeZone,
  useTranslations,
} from "next-intl";
import { Box, Button, GlobalStyles, Stack, Typography } from "@mui/material";
import PrintIcon from "@mui/icons-material/Print";
import type { EntryBill } from "@/app/lib/order/orderTotals";
import BillLineRows from "@/app/components/BillLineRows";
import NameLanguageToggle from "@/app/components/NameLanguageToggle";
import type { AppLocale } from "@/app/lib/i18n/locale";
import {
  VOUCHER_LANGUAGE_KEY,
  parseStoredLanguage,
} from "@/app/lib/i18n/staffMenuLanguage";
import {
  readStorage,
  useStoredValue,
  writeStorage,
} from "@/app/lib/hooks/useStoredValue";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";
import type { VoucherMessages } from "./voucherMessages";

// Receipt roll width — the ONE value to change for another printer
// (e.g. 58 for a 58mm roll). Content width follows from it.
const PAPER_WIDTH_MM = 80;
// Blank edge kept on each side: 80mm paper → 72mm of content.
const SIDE_MARGIN_MM = 4;
// CSS pixels are defined as 1/96 inch; 25.4mm per inch.
const MM_PER_CSS_PX = 25.4 / 96;

// The print date is rendered in the browser only: it's "now" on the
// till, which the server's render can't match (hydration would keep the
// server's moment). Every time is in the SHOP's timezone (next-intl).
const subscribeNever = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/** "Sep 26, 2026, 11:30 PM" in shop time, in the voucher's language —
 *  the print time and a paid bill's paid time. */
function useDateTime() {
  const format = useFormatter();
  return (date: Date) =>
    format.dateTime(date, { dateStyle: "medium", timeStyle: "short", numberingSystem: "latn" });
}

/** The voucher's language on this device: its own remembered choice
 *  (printVoucherLang:v1), else the staff's Backoffice language. */
function useVoucherLanguage(): [AppLocale, (next: AppLocale) => void] {
  const staffLocale = useLocale();
  const stored = useStoredValue(() => readStorage(VOUCHER_LANGUAGE_KEY), null);
  return [
    parseStoredLanguage(stored, staffLocale),
    (next) => writeStorage(VOUCHER_LANGUAGE_KEY, next),
  ];
}

type ReceiptRound = EntryBill["acceptedRounds"][number];

interface ReceiptLayoutProps {
  /** Screen-only "back" link (e.g. to the order, or to History). */
  backHref: string;
  /** Its words (bo.print), in the staff's language. */
  backLabel: "backToOrder" | "backToHistory";
  shopName: string;
  locationName: string | null;
  /** Table name or Counter bill number; null for the Counter (the
   *  voucher writes the word in its own language). */
  title: string | null;
  /** The voucher's words in both languages (voucherMessages). */
  voucherMessages: VoucherMessages;
  rounds: ReceiptRound[];
  /** Printed as the total — the open bill's computed total, or a paid
   *  bill's stored Bill.total snapshot. */
  total: number;
  /** Open bill only: rounds awaiting approval, left off the receipt. */
  pendingCount?: number;
  /** The line under the total: "BILL — NOT PAID" for an open bill,
   *  "PAID · <paid date/time>" for a settled one (ISO time). */
  status: { paid: false } | { paid: true; paidAt: string };
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
 * A bill on thermal-receipt paper — the ONE receipt layout behind both
 * the open bill (/print/order/[entryKey]) and a paid bill's reprint
 * (/print/bill/[billId]), so the two can't look different: rounds line
 * by line, the total, then the status line ("BILL — NOT PAID" — printing
 * never settles anything, Mark as paid does — or "PAID · <when>"). Black
 * on white whatever the app's light/dark mode, no tints, shadows,
 * rounded corners or images.
 *
 * Prints itself once, after rendering and after web fonts load. The
 * page is exactly as long as the receipt: `@page { size: 80mm auto }`
 * isn't valid CSS (size takes one or two lengths, and browsers drop the
 * whole rule), so the receipt's rendered height is measured and used
 * as the page height instead. After printing, a tab opened by a Print
 * button (PrintBillButton — window.opener) closes itself.
 */
type VoucherProps = Omit<
  ReceiptLayoutProps,
  "backHref" | "backLabel" | "voucherMessages"
> & { printedAt: Date; isClient: boolean };

/** The paper itself — every word from the voucher's provider (its own
 *  language: labels, money words, the shop's Myanmar names). */
function Voucher({
  shopName,
  locationName,
  title,
  rounds,
  total,
  pendingCount = 0,
  status,
  printedAt,
  isClient,
}: VoucherProps) {
  const t = useTranslations("bo.print");
  const money = useStaffMoney();
  const format = useFormatter();
  const dateTime = useDateTime();
  const clockTime = (iso: string) =>
    format.dateTime(new Date(iso), { hour: "numeric", minute: "2-digit", numberingSystem: "latn" });

  return (
    <>
      <Typography component="h1" variant="h6" align="center">
        {shopName}
      </Typography>
      {locationName && (
        <Typography variant="body2" align="center">
          {locationName}
        </Typography>
      )}
      <Typography variant="body1" align="center">
        {title ?? t("counter")}
      </Typography>
      <Typography variant="caption" component="p" align="center">
        {isClient && dateTime(printedAt)}
      </Typography>

      <Rule />

      {rounds.length === 0 && (
        <Typography variant="body2">{t("noAccepted")}</Typography>
      )}
      {rounds.map((round) => (
        <Box key={round.orderNumber} component="section" sx={{ mb: 1 }}>
          <Typography
            component="h2"
            variant="overline"
            sx={{ display: "block" }}
          >
            {t("roundAt", { number: round.orderNumber, time: clockTime(round.time) })}
          </Typography>
          {round.lines.map((line) => (
            // Itemised like the on-screen bill; compact, all black. Names
            // and money in the voucher's language (this provider's).
            <BillLineRows
              key={line.id}
              rows={line.breakdown}
              density="compact"
              print
            />
          ))}
        </Box>
      ))}

      <Rule />

      <Stack
        direction="row"
        spacing={1}
        sx={{ justifyContent: "space-between", alignItems: "baseline" }}
      >
        <Typography variant="body1">{t("total")}</Typography>
        <Typography component="p" variant="h5">
          {money.amount(total)}
        </Typography>
      </Stack>
      {pendingCount > 0 && (
        <Typography variant="caption" component="p">
          {t("pendingNotIncluded", { count: pendingCount })}
        </Typography>
      )}

      <Rule />

      <Typography variant="overline" component="p" align="center">
        {status.paid
          ? isClient
            ? t("paidAt", { time: dateTime(new Date(status.paidAt)) })
            : t("paid")
          : t("notPaid")}
      </Typography>
      <Typography variant="body2" align="center">
        {t("thankYou")}
      </Typography>
    </>
  );
}

/**
 * A bill on thermal-receipt paper — the ONE receipt layout behind both
 * the open bill (/print/order/[entryKey]) and a paid bill's reprint
 * (/print/bill/[billId]), so the two can't look different: rounds line
 * by line, the total, then the status line ("BILL — NOT PAID" — printing
 * never settles anything, Mark as paid does — or "PAID · <when>"). Black
 * on white whatever the app's light/dark mode, no tints, shadows,
 * rounded corners or images.
 *
 * The screen-only bar above it has the voucher's EN | မြန်မာ — its
 * labels, money words and the shop's Myanmar names (default: the staff's
 * Backoffice language; remembered per device) — never on paper.
 *
 * Prints itself once, after rendering and after web fonts load. The
 * page is exactly as long as the receipt: `@page { size: 80mm auto }`
 * isn't valid CSS (size takes one or two lengths, and browsers drop the
 * whole rule), so the receipt's rendered height is measured and used
 * as the page height instead. After printing, a tab opened by a Print
 * button (PrintBillButton — window.opener) closes itself.
 */
export default function ReceiptLayout({
  backHref,
  backLabel,
  voucherMessages,
  ...voucher
}: ReceiptLayoutProps) {
  const t = useTranslations("bo.print");
  const timeZone = useTimeZone();
  const now = useNow();
  const [voucherLanguage, setVoucherLanguage] = useVoucherLanguage();
  const isClient = useIsClient();
  const [printedAt] = useState(() => new Date());
  const receiptRef = useRef<HTMLDivElement>(null);
  const [pageHeightMm, setPageHeightMm] = useState<number | null>(null);
  const hasPrinted = useRef(false);

  // Measured again whenever the language changes (Myanmar lines are
  // taller), so the page always fits the receipt.
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
  }, [isClient, voucherLanguage]);

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

      {/* Screen only: the voucher's language, print again or go back
          (e.g. when the tab wasn't opened by the button and so doesn't
          close itself). Never on paper (displayPrint: none). */}
      <Stack
        direction="row"
        useFlexGap
        sx={{
          justifyContent: "center",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1,
          p: 2,
          displayPrint: "none",
        }}
      >
        <Button
          component={Link}
          href={backHref}
          variant="outlined"
          color="inherit"
          sx={{ minHeight: 44 }}
        >
          {t(backLabel)}
        </Button>
        <NameLanguageToggle
          value={voucherLanguage}
          onChange={setVoucherLanguage}
          ariaLabel={t("voucherLanguage")}
        />
        <Button
          variant="contained"
          color="primary"
          startIcon={<PrintIcon />}
          onClick={() => window.print()}
          sx={{ minHeight: 44 }}
        >
          {t("print")}
        </Button>
      </Stack>

      <Box
        ref={receiptRef}
        lang={voucherLanguage}
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
        <NextIntlClientProvider
          locale={voucherLanguage}
          messages={voucherMessages[voucherLanguage]}
          timeZone={timeZone}
          now={now}
        >
          <Voucher {...voucher} printedAt={printedAt} isClient={isClient} />
        </NextIntlClientProvider>
      </Box>
    </>
  );
}
