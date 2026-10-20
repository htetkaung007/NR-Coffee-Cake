"use client";

import type { MouseEvent } from "react";
import Link from "next/link";
import { Box, Button, Card, Stack, Typography } from "@mui/material";
import { isPlainLeftClick } from "@/app/lib/isPlainLeftClick";
import { useLocale, useTranslations } from "next-intl";
import { localizedText } from "@/app/lib/i18n/localizedText";
import { useStaffMoney } from "@/app/lib/hooks/useStaffWords";
import { buildItemList } from "@/app/lib/report/reportView";
import { ErrorRetry, PreviewRowsSkeleton } from "./ReportStates";
import type { ItemsState } from "./useReportItems";
import {
  entryTitleSx,
  moneyToneSx,
  sectionHeadingSx,
} from "../order/orderTypography";

const BEST_COUNT = 5;
const SLOW_COUNT = 3;

interface SellersPreviewProps {
  variant: "best" | "slow";
  state: ItemsState;
  onRetry: () => void;
  /** Where "See all" leads — the Items tab, on the matching list. */
  seeAllHref: string;
  onNavigate: (href: string) => void;
}

/** The Overview's peek at the Items report: the five best sellers by
 *  sales, or the three slowest orderable menus (menus with no sales
 *  included). It waits for the Items data on its own — a skeleton while
 *  that loads — so the Overview itself never does. */
export default function SellersPreview({
  variant,
  state,
  onRetry,
  seeAllHref,
  onNavigate,
}: SellersPreviewProps) {
  const t = useTranslations("bo.reports");
  const locale = useLocale();
  const money = useStaffMoney();
  const isBest = variant === "best";
  const title = isBest ? t("bestSellers") : t("slowSellers");

  const rows =
    state.status !== "ok"
      ? []
      : isBest
        ? buildItemList({
            items: state.data.items,
            slowSellers: [],
            list: "top",
            sortBy: "sales",
            categoryId: null,
            search: "",
          }).slice(0, BEST_COUNT)
        : buildItemList({
            items: state.data.items,
            slowSellers: state.data.slowSellers,
            list: "slow",
            sortBy: "quantity",
            categoryId: null,
            search: "",
          }).slice(0, SLOW_COUNT);

  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Stack
        direction="row"
        sx={{ alignItems: "center", justifyContent: "space-between", mb: 1 }}
      >
        <Typography variant="body1" component="h2" sx={sectionHeadingSx}>
          {title}
        </Typography>
        <Button
          component={Link}
          href={seeAllHref}
          aria-label={t("seeAllOf", { list: title })}
          onClick={(event: MouseEvent<HTMLElement>) => {
            if (isPlainLeftClick(event)) {
              event.preventDefault();
              onNavigate(seeAllHref);
            }
          }}
          sx={{ minHeight: 44 }}
        >
          {t("seeAll")}
        </Button>
      </Stack>

      {state.status === "loading" && (
        <PreviewRowsSkeleton rows={isBest ? BEST_COUNT : SLOW_COUNT} />
      )}
      {state.status === "error" && (
        <ErrorRetry message={state.message} onRetry={onRetry} />
      )}
      {state.status === "ok" && rows.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          {isBest ? t("noSalesPeriod") : t("noMenusToShow")}
        </Typography>
      )}
      {state.status === "ok" && rows.length > 0 && (
        <Stack component="ol" sx={{ m: 0, p: 0, listStyle: "none" }}>
          {rows.map((row, index) => (
            <Stack
              key={row.menuId}
              component="li"
              direction="row"
              spacing={1.5}
              sx={{
                alignItems: "center",
                minHeight: 44,
                py: 0.5,
                borderTop: index === 0 ? 0 : 1,
                borderColor: "divider",
              }}
            >
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ width: 20, flexShrink: 0 }}
              >
                {row.rank}
              </Typography>
              <Typography
                variant="body1"
                noWrap
                sx={{ ...entryTitleSx, flexGrow: 1, minWidth: 0 }}
              >
                {localizedText(locale, row.name, row.nameMy)}
              </Typography>
              {isBest ? (
                <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                  <Typography
                    variant="body1"
                    sx={{ ...moneyToneSx("income"), lineHeight: 1.3 }}
                  >
                    {money.amount(row.itemSales)}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: "block", lineHeight: 1.2 }}
                  >
                    {row.share}%
                  </Typography>
                </Box>
              ) : (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ flexShrink: 0 }}
                >
                  {row.quantity === 0 && row.itemSales === 0
                    ? t("noSalesPeriod")
                    : t("sold", { count: row.quantity })}
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      )}
    </Card>
  );
}
