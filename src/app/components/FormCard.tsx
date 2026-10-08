"use client";

import type { ReactNode } from "react";
import { Alert, Box, Snackbar, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

/**
 * The Backoffice's bordered form card — an optional icon + title header,
 * the error alert, then the fields in a stack. Shared by the New / Edit
 * Location and Table forms and the menu form. It is the <form> itself
 * when given `onSubmit`; without it, just the card (for a page whose
 * form wraps more than the card).
 */
export default function FormCard({
  onSubmit,
  header,
  error,
  spacing = 2.5,
  sx,
  children,
}: {
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  header?: { icon: ReactNode; title: string; subtitle?: string };
  error?: string | null;
  spacing?: number;
  sx?: SxProps<Theme>;
  children: ReactNode;
}) {
  return (
    <Box
      component={onSubmit ? "form" : "div"}
      onSubmit={onSubmit}
      sx={[
        {
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
        },
        ...(Array.isArray(sx) ? sx : [sx]),
      ]}
    >
      {header && (
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            gap: 1,
            pb: 2,
            mb: 2.5,
            borderBottom: "1px solid",
            borderColor: "divider",
          }}
        >
          {header.icon}
          {header.subtitle ? (
            <Box>
              <Typography variant="h6">{header.title}</Typography>
              <Typography variant="caption" color="text.secondary">
                {header.subtitle}
              </Typography>
            </Box>
          ) : (
            <Typography variant="h6">{header.title}</Typography>
          )}
        </Box>
      )}
      <Stack spacing={spacing}>
        {error && <Alert severity="error">{error}</Alert>}
        {children}
      </Stack>
    </Box>
  );
}

/** The brief "… created / updated successfully!" toast a create or edit
 *  page shows before it navigates away. */
export function SuccessSnackbar({
  open,
  onClose,
  message,
}: {
  open: boolean;
  onClose: () => void;
  message: string;
}) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={1000}
      onClose={onClose}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
    >
      <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
}
