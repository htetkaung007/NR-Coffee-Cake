"use client";

import { Container, Paper } from "@mui/material";

/** The card every auth screen sits in (sign in, sign up, sign-up
 *  closed): a centred, small-width Paper. */
export default function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <Container maxWidth="sm">
      <Paper
        elevation={3}
        sx={{
          p: 4,
          mt: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          borderRadius: 4,
          bgcolor: "background.paper",
        }}
      >
        {children}
      </Paper>
    </Container>
  );
}
