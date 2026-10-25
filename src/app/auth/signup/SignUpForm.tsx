"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import {
  Box,
  Button,
  TextField,
  Typography,
  Alert,
  Link,
  Divider,
} from "@mui/material";
import AuthCard from "../AuthCard";
import GoogleIcon from "@mui/icons-material/Google";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { useStaffErrorMessage, useStaffGenericError } from "@/app/lib/hooks/useStaffWords";
import { registerAction } from "./action";
import AuthCredentialFields from "../AuthCredentialFields";
import { authButtonSx } from "../authButtonSx";
import AuthHeading from "../AuthHeading";
import SubmitButton from "@/app/components/SubmitButton";
import { useSubmitLock } from "@/app/lib/hooks/useSubmitLock";

export function SignUpForm() {
  const t = useTranslations("bo.auth");
  const errorText = useStaffErrorMessage();
  const genericError = useStaffGenericError();
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Locked from the first tap (a double tap must not register twice) and
  // kept locked once registered, while router.push leaves the page.
  const submitLock = useSubmitLock();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Form submission logic
    void submitLock.run(async () => {
      setErrorMessage(null);

      const result = await registerAction({ name, email, password });

      if (!result.success) {
        setErrorMessage(errorText(result.error));
        return;
      }

      // Registered — the account exists, so nothing may send again.
      submitLock.keepLocked();

      // Sign in straight away (a Server Action can't set the session
      // cookie — CLAUDE.md §9).
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        // Rare: registered, but the automatic sign-in failed — send them
        // to the sign-in page rather than into the Backoffice.
        setErrorMessage(t("autoSignInFailed"));
        router.push("/auth/signIn");
        return;
      }

      router.push("/backoffice");
    }, () => setErrorMessage(genericError));
  }

  const handleGoogleSignUp = async () => {
    try {
      await signIn("google", { callbackUrl: "/backoffice" });
    } catch (error) {
      console.error("[SignUpForm] Google sign-up failed:", error);
      setErrorMessage(t("googleSignUpError"));
    }
  };

  return (
    <AuthCard>
      <AuthHeading
        eyebrow={t("startJourney")}
        title={t("createAccount")}
        intro={t("signUpIntro")}
      />

      {/* Google Sign Up Button */}
      <Button
        fullWidth
        variant="outlined"
        startIcon={<GoogleIcon />}
        onClick={handleGoogleSignUp}
        size="large"
        sx={{ ...authButtonSx, mb: 3 }}
      >
        {t("signUpGoogle")}
      </Button>

      <Divider sx={{ width: "100%", mb: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
          {t("orEmail")}
        </Typography>
      </Divider>

      {/* Form Section */}
      <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
        <TextField
          fullWidth
          label={t("fullName")}
          variant="outlined"
          margin="normal"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <AuthCredentialFields
          email={email}
          onEmailChange={setEmail}
          password={password}
          onPasswordChange={setPassword}
        />

        {errorMessage && (
          <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
            {errorMessage}
          </Alert>
        )}

        <SubmitButton
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          status={submitLock.status}
          busyLabel={t("creatingAccount")}
          doneLabel={t("accountCreated")}
          sx={{ ...authButtonSx, mt: 4 }}
        >
          {t("signUp")}
        </SubmitButton>

        {/* Footer Link */}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            {t("haveAccount")}{" "}
            <Link
              component={NextLink}
              href="/auth/signIn"
              variant="body2"
              sx={{ fontWeight: "bold", textDecoration: "none" }}
            >
              {t("signIn")}
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthCard>
  );
}
