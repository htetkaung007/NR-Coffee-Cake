"use client";

import { Stack, Typography } from "@mui/material";
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
 */
export default function OrdersPageHeader({
  actions,
  title = "Orders",
  showSectionNav = true,
}: {
  actions?: React.ReactNode;
  /** Another page of the Backoffice (Reports) reuses this header row with
   *  its own title. */
  title?: string;
  /** The [Open] [History] switch belongs to the Orders pages only. */
  showSectionNav?: boolean;
}) {
  return (
    <Stack
      direction="row"
      useFlexGap
      sx={{
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
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
          width: { xs: "100%", sm: "auto" },
          justifyContent: { xs: "space-between", sm: "flex-start" },
        }}
      >
        <Typography component="h1" variant="h6">
          {title}
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
