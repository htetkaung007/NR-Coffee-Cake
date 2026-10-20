"use client";

import { Stack, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import OrderSectionNav from "./OrderSectionNav";

/**
 * The one header row shared by the Order List (/backoffice/order) and
 * Order History (/backoffice/order/history), so the two read as tabs of
 * one page: the "Orders" title and the [Open] [History] switch on the
 * left, each page's own controls in `actions` on the right.
 *
 * Phones (below sm): the title on the left, the switch at the right
 * edge of the same row, and `actions` on the line(s) below. sm and up:
 * the switch sits right next to the title, and `actions` stays on the
 * right while it fits (wrapping below when the row gets too narrow).
 * `inlineActions` (Reports): `actions` stays on the title's row, at its
 * right end, at every width.
 */
export default function OrdersPageHeader({
  actions,
  title,
  showSectionNav = true,
  inlineActions = false,
}: {
  actions?: React.ReactNode;
  /** Another page of the Backoffice (Reports) reuses this header row with
   *  its own title. */
  title?: string;
  /** The [Open] [History] switch belongs to the Orders pages only. */
  showSectionNav?: boolean;
  /** Keep `actions` beside the title on phones too (never its own row). */
  inlineActions?: boolean;
}) {
  const t = useTranslations("bo.orders");
  return (
    <Stack
      direction="row"
      useFlexGap
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        // Reports, phones: Export never drops to its own row.
        flexWrap: inlineActions ? { xs: "nowrap", sm: "wrap" } : "wrap",
        gap: 1.5,
      }}
    >
      <Stack
        direction="row"
        useFlexGap
        sx={{
          alignItems: "center",
          flexWrap: "wrap",
          gap: 1.5,
          width: { xs: inlineActions ? "auto" : "100%", sm: "auto" },
          ...(inlineActions && { minWidth: { xs: 0, sm: "auto" } }),
          justifyContent: { xs: "space-between", sm: "flex-start" },
        }}
      >
        <Typography component="h1" variant="h6">
          {title ?? t("title")}
        </Typography>
        {showSectionNav && <OrderSectionNav />}
      </Stack>
      {actions && (
        <Stack
          direction="row"
          useFlexGap
          sx={{ alignItems: "center", flexWrap: "wrap", gap: 1 }}
        >
          {actions}
        </Stack>
      )}
    </Stack>
  );
}
