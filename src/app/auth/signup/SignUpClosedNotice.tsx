"use client";

import NextLink from "next/link";
import { Box, Button, Container, Paper, Typography } from "@mui/material";
import { SIGNUP_CLOSED_MESSAGE } from "@/app/lib/access/signUp";

/** What /auth/signup shows instead of the form once the shop exists
 *  (single-shop mode). Display only — the sign-up action refuses on its
 *  own (AppService.createDefaultSetup). */
export function SignUpClosedNotice() {
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
        <Box sx={{ mb: 4, textAlign: "center" }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Sign-up is closed
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {SIGNUP_CLOSED_MESSAGE}
          </Typography>
        </Box>

        <Button
          component={NextLink}
          href="/auth/signIn"
          fullWidth
          variant="contained"
          sx={{
            py: 1.5,
            borderRadius: 3,
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          Go to sign in
        </Button>
      </Paper>
    </Container>
  );
}
