"use client";

import { Box, Button, Card, Skeleton, Stack, Typography } from "@mui/material";

/** Skeletons shaped like what they stand in for (DESIGN.md Rule 14), so
 *  nothing jumps when the data arrives. Static — no animation of ours. */

function KpiSkeleton() {
  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Skeleton variant="text" width="40%" />
      <Skeleton variant="text" width="70%" sx={{ fontSize: "1rem" }} />
      <Skeleton variant="text" width="60%" />
    </Card>
  );
}

const BAR_HEIGHTS = [45, 70, 55, 85, 60, 95, 40];

function ChartSkeleton() {
  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Skeleton variant="text" width={120} />
      <Skeleton variant="text" width={80} sx={{ mb: 1 }} />
      <Stack
        direction="row"
        spacing={1}
        sx={{ alignItems: "flex-end", height: { xs: 160, sm: 200 }, pl: 5 }}
      >
        {BAR_HEIGHTS.map((height, index) => (
          <Skeleton
            key={index}
            variant="rounded"
            sx={{ flex: 1, height: `${height}%` }}
          />
        ))}
      </Stack>
      <Skeleton variant="text" sx={{ mt: 1 }} />
    </Card>
  );
}

function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <Card variant="outlined" sx={{ p: { xs: 1.5, sm: 2 } }}>
      <Skeleton variant="text" width={140} sx={{ mb: 1 }} />
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} variant="text" />
      ))}
    </Card>
  );
}

/** The whole Overview while it loads (also the route's loading.tsx). */
export function OverviewSkeleton() {
  return (
    <Stack spacing={2} aria-busy>
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
          gap: 1.5,
        }}
      >
        {[0, 1, 2, 3].map((index) => (
          <KpiSkeleton key={index} />
        ))}
      </Box>
      <ChartSkeleton />
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)" },
          gap: 2,
        }}
      >
        <Stack spacing={2}>
          <CardSkeleton />
          <CardSkeleton />
        </Stack>
        <Stack spacing={2}>
          <CardSkeleton lines={5} />
          <CardSkeleton />
        </Stack>
      </Box>
    </Stack>
  );
}

/** A sellers preview while the Items data is on its way. */
export function PreviewRowsSkeleton({ rows }: { rows: number }) {
  return (
    <Stack spacing={1}>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} variant="rounded" height={44} />
      ))}
    </Stack>
  );
}

/** The Items list while it loads. */
export function ItemRowsSkeleton() {
  return (
    <Stack spacing={1} aria-busy>
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <Stack
          key={index}
          direction="row"
          spacing={1.5}
          sx={{
            alignItems: "center",
            px: { xs: 1.5, sm: 2 },
            py: 1.5,
            border: 1,
            borderColor: "divider",
            borderRadius: 2,
          }}
        >
          <Skeleton variant="text" width={20} />
          <Box sx={{ flexGrow: 1 }}>
            <Skeleton variant="text" width="45%" />
            <Skeleton variant="text" width="75%" />
          </Box>
          <Skeleton variant="text" width={72} />
        </Stack>
      ))}
    </Stack>
  );
}

/** Plain-language error and a way to try again, in place of the data —
 *  the page's controls stay where they are. */
export function ErrorRetry({
  message,
  onRetry,
  dense = false,
}: {
  message: string;
  onRetry: () => void;
  /** Less room around it — for an error inside a card or a panel. */
  dense?: boolean;
}) {
  return (
    <Stack
      spacing={1}
      sx={{ alignItems: "center", textAlign: "center", py: dense ? 1 : 4 }}
    >
      <Typography color="text.secondary">{message}</Typography>
      <Button variant="outlined" onClick={onRetry} sx={{ minHeight: 44 }}>
        Retry
      </Button>
    </Stack>
  );
}
