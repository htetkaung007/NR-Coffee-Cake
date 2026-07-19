"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Alert,
  CircularProgress,
  Link,
  Divider,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";
import { registerAction } from "../auth/signup/action";

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

    // Register အောင်မြင်ရင် ချက်ချင်း sign-in ဆက်လုပ် (Credentials provider)
    const signInResult = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setIsSaving(false);

    if (signInResult?.error) {
      // Register အောင်မြင်ပေမယ့် auto sign-in fail ဖြစ်ရင် (rare edge case)
      // backoffice ကို ဒီအတိုင်း မပို့ဘဲ sign-in page ကို ပြန်ပို့
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
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
          />
          <TextField
            fullWidth
            label="Email Address"
            type="email"
            variant="outlined"
            margin="normal"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
          />
          <TextField
            fullWidth
            label="Password"
            type="password"
            variant="outlined"
            margin="normal"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            sx={{ "& .MuiOutlinedInput-root": { borderRadius: 3 } }}
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
                component="button"
                variant="body2"
                type="button"
                onClick={() => router.push("/auth/signIn")}
                sx={{ fontWeight: "bold", textDecoration: "none" }}
              >
                Sign In
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
