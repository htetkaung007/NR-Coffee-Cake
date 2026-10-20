import type { ReactNode } from "react";
import { Box } from "@mui/material";

/** THE centred page column of the Backoffice's form-like pages (New /
 *  Edit Location and Table, Settings): one max width, centred, with the
 *  page padding. A PageHeader's back link stays on the left inside it. */
export default function CenteredPage({ children }: { children: ReactNode }) {
  return (
    <Box sx={{ maxWidth: 480, mx: "auto", p: { xs: 2, sm: 3, md: 4 } }}>{children}</Box>
  );
}
