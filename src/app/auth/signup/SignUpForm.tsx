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
  CircularProgress,
  Link,
  Divider,
} from "@mui/material";
import AuthCard from "../AuthCard";
import GoogleIcon from "@mui/icons-material/Google";
import NextLink from "next/link";
import { registerAction } from "./action";
import AuthCredentialFields from "../AuthCredentialFields";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); // Form submission logic
    setIsSaving(true);
    setErrorMessage(null);

    const result = await registerAction({ name, email, password });

    if (!result.success) {
      setErrorMessage(result.error.message);
      setIsSaving(false);
      return;
    }

    // Registered: sign in straight away (a Server Action can't set the
    // session cookie — CLAUDE.md §9).
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSaving(false);

    if (signInResult?.error) {
      // Rare: registered, but the automatic sign-in failed — send them to
      // the sign-in page rather than into the Backoffice.
      setErrorMessage(
        "Account created, but automatic sign-in failed. Please sign in.",
      );
      router.push("/auth/signIn");
      return;
    }

    router.push("/backoffice");
  }

  const handleGoogleSignUp = async () => {
    try {
      await signIn("google", { callbackUrl: "/backoffice" });
    } catch (error) {
      console.error("[SignUpForm] Google sign-up failed:", error);
      setErrorMessage("An error occurred with Google Sign Up.");
    }
  };

  return (
    <AuthCard>
      {/* Header Section */}
      <Box sx={{ mb: 4, textAlign: "center" }}>
        <Typography
          variant="overline"
          sx={{ letterSpacing: 4, fontWeight: "bold", color: "primary.main" }}
        >
          Start Your Journey
        </Typography>
        <Typography
          variant="h4"
          component="h1"
          sx={{ mt: 1, fontWeight: 600 }}
        >
          Create Account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Join us today and experience the best cafe management system.
        </Typography>
      </Box>

      {/* Google Sign Up Button */}
      <Button
        fullWidth
        variant="outlined"
        startIcon={<GoogleIcon />}
        onClick={handleGoogleSignUp}
        sx={{
          py: 1.5,
          borderRadius: 3,
          textTransform: "none",
          fontSize: "1rem",
          mb: 3,
        }}
      >
        Sign Up with Google
      </Button>

      <Divider sx={{ width: "100%", mb: 3 }}>
        <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
          OR WITH EMAIL
        </Typography>
      </Divider>

      {/* Form Section */}
      <Box component="form" onSubmit={handleSubmit} sx={{ width: "100%" }}>
        <TextField
          fullWidth
          label="Full Name"
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

        <Button
          type="submit"
          fullWidth
          variant="contained"
          disabled={isSaving}
          sx={{
            mt: 4,
            py: 1.5,
            borderRadius: 3,
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          {isSaving ? (
            <CircularProgress size={24} color="inherit" />
          ) : (
            "Sign Up"
          )}
        </Button>

        {/* Footer Link */}
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            Already have an account?{" "}
            <Link
              component={NextLink}
              href="/auth/signIn"
              variant="body2"
              sx={{ fontWeight: "bold", textDecoration: "none" }}
            >
              Sign In
            </Link>
          </Typography>
        </Box>
      </Box>
    </AuthCard>
  );
}
