"use client";

import type { ReactNode } from "react";
import { Box, Stack, Typography } from "@mui/material";
import BackLink from "./BackLink";

/**
 * The top of every Backoffice create/edit page: a back link to the
 * section's list page (BackLink), the page title as its h1, and an
 * optional action on the right.
 */
export default function PageHeader({
  title,
  backHref,
  backLabel,
  action,
}: {
  title: string;
  backHref: string;
  backLabel: string;
  action?: ReactNode;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", mb: 2 }}>
      <BackLink href={backHref} label={backLabel} />
      <Typography
        component="h1"
        variant="h6"
        sx={{ flexGrow: 1, minWidth: 0, overflowWrap: "anywhere" }}
      >
        {title}
      </Typography>
      {action && <Box sx={{ flexShrink: 0 }}>{action}</Box>}
    </Stack>
  );
}
