"use client";

import NextLink from "next/link";
import { Box, Button, Typography } from "@mui/material";
import AuthCard from "../AuthCard";
import { useTranslations } from "next-intl";
import { authButtonSx } from "../authButtonSx";

/** What /auth/signup shows instead of the form once the shop exists
 *  (single-shop mode). Display only — the sign-up action refuses on its
 *  own (AppService.createDefaultSetup). */
export function SignUpClosedNotice() {
  const t = useTranslations("bo.auth");
  return (
    <AuthCard>
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
          {t("signUpClosedTitle")}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {t("signUpClosed")}
        </Typography>
      </Box>

      <Button
        component={NextLink}
        href="/auth/signIn"
        fullWidth
        variant="contained"
        size="large"
        sx={authButtonSx}
      >
        {t("goToSignIn")}
      </Button>
    </AuthCard>
  );
}
