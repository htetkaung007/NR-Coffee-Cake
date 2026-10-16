import type { ReactNode } from "react";
import { Alert, Box, Typography } from "@mui/material";

/**
 * The red-edged block at the foot of a Backoffice edit page for a
 * permanent delete (EditLocation, EditTable): an error from the last try,
 * the block's title, then what the page puts in it.
 */
export default function DangerZone({
  title,
  titleId,
  error,
  children,
}: {
  title: string;
  /** Given: the block is a <section> named by its title (a landmark). */
  titleId?: string;
  error: string | null;
  children: ReactNode;
}) {
  return (
    <Box
      component={titleId ? "section" : "div"}
      aria-labelledby={titleId}
      sx={{
        border: "1px solid",
        borderColor: "error.main",
        borderRadius: 3,
        p: { xs: 2, sm: 3 },
      }}
    >
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Typography variant="body2" id={titleId} sx={{ mb: 0.5 }}>
        {title}
      </Typography>
      {children}
    </Box>
  );
}
