"use client";

import { Box, Stack, Typography } from "@mui/material";
import type { PairingRow } from "@/app/lib/report/reportView";
import { visuallyHiddenSx } from "@/app/lib/theme/sharedThemeTokens";
import { entryTitleSx } from "../order/orderTypography";

/** Up to three lines of "Extra shot · 62% · ▬▬▬ · n = 94 units". The rate
 *  is always written out; the thin bar only repeats it (aria-hidden), and
 *  a screen reader also gets the plain counts ("58 of 94 units"). The bar
 *  runs 0–100%, so two rows can be compared by eye. */
export default function PairRows({ rows }: { rows: PairingRow[] }) {
  return (
    <Stack component="ul" spacing={1} sx={{ m: 0, p: 0, listStyle: "none" }}>
      {rows.map((row) => (
        <Box
          key={row.id}
          component="li"
          sx={{
            display: "grid",
            alignItems: "center",
            columnGap: 1.5,
            rowGap: 0.5,
            minHeight: 32,
            gridTemplateColumns: {
              xs: "minmax(0, 1fr) auto",
              // From sm the columns sit together at the left, so a name
              // is next to its percentage instead of a screen away.
              sm: "minmax(0, 220px) 52px 140px max-content",
            },
            gridTemplateAreas: {
              xs: '"name rate" "bar n"',
              sm: '"name rate bar n"',
            },
          }}
        >
          <Typography
            variant="body1"
            noWrap
            sx={{ ...entryTitleSx, gridArea: "name" }}
          >
            {row.name}
          </Typography>
          <Typography
            variant="body1"
            sx={{ ...entryTitleSx, gridArea: "rate", textAlign: "right" }}
          >
            {row.rate}%
            <Box component="span" sx={visuallyHiddenSx}>
              {` — ${row.pairUnits} of ${row.menuUnits} units`}
            </Box>
          </Typography>
          <Box
            aria-hidden
            sx={{
              gridArea: "bar",
              height: 4,
              borderRadius: 2,
              bgcolor: "divider",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                width: `${Math.min(100, Math.max(0, row.rate))}%`,
                height: "100%",
                bgcolor: "primary.main",
              }}
            />
          </Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ gridArea: "n", textAlign: { xs: "right", sm: "left" } }}
          >
            n = {row.menuUnits} units
          </Typography>
        </Box>
      ))}
    </Stack>
  );
}
