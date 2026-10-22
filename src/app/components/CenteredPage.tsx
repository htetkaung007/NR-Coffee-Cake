import type { ReactNode } from "react";
import { Box } from "@mui/material";

/** The form pages' column (New / Edit Location and Table). */
const CENTERED_PAGE_MAX_WIDTH = 480;

/** THE centred page column of the Backoffice's form-like pages (New /
 *  Edit Location and Table, Settings): fluid up to a max width, centred,
 *  with the page padding. A PageHeader's back link stays on the left
 *  inside it. Settings passes its own, wider `maxWidth`. */
export default function CenteredPage({
  maxWidth = CENTERED_PAGE_MAX_WIDTH,
  children,
}: {
  maxWidth?: number;
  children: ReactNode;
}) {
  return (
    <Box sx={{ maxWidth, mx: "auto", p: { xs: 2, sm: 3, md: 4 } }}>{children}</Box>
  );
}
