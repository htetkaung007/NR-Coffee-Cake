"use client";

import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Divider,
  Alert,
  Link,
} from "@mui/material";
import AuthCard from "../AuthCard";
import NextLink from "next/link";
import GoogleIcon from "@mui/icons-material/Google";
import { SIGNUP_CLOSED_ERROR } from "@/app/lib/access/signUp";
import AuthCredentialFields from "../AuthCredentialFields";
import { isAppPath } from "@/app/lib/http/appPath";
import { authButtonSx } from "../authButtonSx";
import AuthHeading from "../AuthHeading";
import AuthSubmitButton from "../AuthSubmitButton";

export default function SignInForm({
  isSignUpOpen,
}: {
  /** Display only — shows the "Sign Up" link while no shop exists yet. */
  isSignUpOpen: boolean;
}) {
  const t = useTranslations("bo.auth");
  const router = useRouter();
  const searchParams = useSearchParams();
  // Only an in-app path — never a full URL (a crafted link could send
  // staff to another site after signing in).
  const requestedCallback = searchParams.get("callbackUrl");
  const callbackUrl = isAppPath(requestedCallback)
    ? requestedCallback
    : "/backoffice";
  // A new Google email while sign-up is closed: NextAuth redirects back
  // here with this error (ensureDefaultSetup) and nothing was created.
  const isSignUpClosedRedirect =
    searchParams.get("error") === SIGNUP_CLOSED_ERROR;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    try {
      // signIn for Google usually works better when awaited or handled for errors
      await signIn("google", { callbackUrl });
    } catch (err) {
      console.error("[SignInForm] Google sign-in failed:", err);
      setError(t("googleSignInError"));
    }
  };

  async function handleCredentialsSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      setLoading(false);

      if (result?.error) {
        setError(t("invalidCredentials"));
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      console.error("[SignInForm] Credentials sign-in failed:", err);
      setLoading(false);
      setError(t("unexpected"));
    }
  }

  return (
    <AuthCard>
      <AuthHeading
        eyebrow={t("welcomeBack")}
        title={t("signIn")}
        intro={t("signInIntro")}
      />

      {isSignUpClosedRedirect && (
        <Alert
          severity="info"
          role="status"
          sx={{ width: "100%", mb: 3, borderRadius: 2 }}
        >
          {t("signUpClosed")}
        </Alert>
      )}

      <Button
        fullWidth
        variant="outlined"
        startIcon={<GoogleIcon />}
        onClick={handleGoogleSignIn}
        size="large"
        sx={{ ...authButtonSx, mb: 3 }}
      >
        {t("continueGoogle")}
      </Button>

      <Divider sx={{ width: "100%", mb: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
          {t("orEmail")}
        </Typography>
      </Divider>

      <Box
        component="form"
        onSubmit={handleCredentialsSubmit}
        sx={{ width: "100%" }}
      >
        <AuthCredentialFields
          email={email}
          onEmailChange={setEmail}
          password={password}
          onPasswordChange={setPassword}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <AuthSubmitButton isBusy={loading}>{t("signIn")}</AuthSubmitButton>

        {isSignUpOpen && (
          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              {t("noAccount")}{" "}
              <Link
                component={NextLink}
                href="/auth/signup"
                variant="body2"
                sx={{ fontWeight: "bold", textDecoration: "none" }}
              >
                {t("signUp")}
              </Link>
            </Typography>
          </Box>
        )}
      </Box>
    </AuthCard>
  );
}
