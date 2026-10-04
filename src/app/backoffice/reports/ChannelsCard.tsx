"use client";

import { Box, Card, Stack, Typography } from "@mui/material";
import StorefrontIcon from "@mui/icons-material/Storefront";
import TableRestaurantIcon from "@mui/icons-material/TableRestaurant";
import { countLabel, formatAmount } from "@/app/lib/orderFormat";
import type { ReportOverview } from "./action";
import {
  moneyColor,
  moneyToneSx,
  sectionHeadingSx,
} from "../order/orderTypography";

type Channels = ReportOverview["current"]["channels"];

/** One stacked bar: Table vs Counter, as shares of sales. The two
 *  channels use the same accents as the Order List's source badges (info
 *  for Table, secondary for Counter), but every number is also written
 *  out beneath — the bar is never the only carrier (DESIGN.md Rule 13). */
export default function ChannelsCard({ channels }: { channels: Channels }) {
  const rows = [
    {
      key: "table" as const,
      label: "Table",
      Icon: TableRestaurantIcon,
      share: channels.tableShare,
      ...channels.table,
    },
    {
      key: "counter" as const,
      label: "Counter",
      Icon: StorefrontIcon,
      share: channels.counterShare,
      ...channels.counter,
    },
  ];
  const hasSales = channels.table.sales + channels.counter.sales > 0;
  const accent = (key: "table" | "counter") =>
    key === "table" ? "info.main" : "secondary.main";

  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Typography variant="body1" component="h2" sx={sectionHeadingSx}>
        Order channels
      </Typography>

      <Box
        role="img"
        aria-label={
          hasSales
            ? `Table ${channels.tableShare}%, Counter ${channels.counterShare}%`
            : "No sales"
        }
        sx={{
          display: "flex",
          gap: "2px",
          height: 16,
          mt: 1.5,
          mb: 1.5,
          borderRadius: 1,
          overflow: "hidden",
          bgcolor: "action.hover",
        }}
      >
        {hasSales &&
          rows.map((row) =>
            row.share > 0 ? (
              <Box
                key={row.key}
                sx={{ flex: `${row.share} 1 0`, bgcolor: accent(row.key) }}
              />
            ) : null,
          )}
      </Box>

      <Stack spacing={1}>
        {rows.map((row) => (
          <Stack
            key={row.key}
            direction="row"
            spacing={1}
            useFlexGap
            sx={{ alignItems: "center", flexWrap: "wrap", minHeight: 32 }}
          >
            <row.Icon
              aria-hidden
              fontSize="small"
              sx={{ color: accent(row.key) }}
            />
            <Typography variant="body1" sx={{ minWidth: 64 }}>
              {row.label}
            </Typography>
            <Typography variant="body1" sx={moneyToneSx("neutral")}>
              {row.share}%
            </Typography>
            <Typography variant="body2" color="text.secondary">
              <Box component="span" sx={{ color: moneyColor("income") }}>
                {formatAmount(row.sales)}
              </Box>{" "}
              · {countLabel(row.bills, "bill", "bills")}
            </Typography>
          </Stack>
        ))}
      </Stack>
    </Card>
  );
}
