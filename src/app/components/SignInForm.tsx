"use client";

import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Divider,
  Alert,
  CircularProgress,
  Link,
} from "@mui/material";
import GoogleIcon from "@mui/icons-material/Google";

export default function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") ?? "/backoffice";

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
      setError("An error occurred with Google Sign In.");
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
        setError("Invalid email or password.");
        return;
      }

      router.push(callbackUrl);
      router.refresh();
    } catch (err) {
      console.error("[SignInForm] Credentials sign-in failed:", err);
      setLoading(false);
      setError("An unexpected error occurred.");
    }
  }

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
          <Typography
            variant="overline"
            sx={{ letterSpacing: 4, fontWeight: "bold", color: "primary.main" }}
          >
            Welcome Back
          </Typography>
          <Typography
            variant="h4"
            component="h1"
            sx={{ mt: 1, fontWeight: 600 }}
          >
            Sign In
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            We are glad to see you again! Please sign in to continue.
          </Typography>
        </Box>

        <Button
          fullWidth
          variant="outlined"
          startIcon={<GoogleIcon />}
          onClick={handleGoogleSignIn}
          sx={{
            py: 1.5,
            borderRadius: 3,
            textTransform: "none",
            fontSize: "1rem",
            mb: 3,
          }}
        >
          Continue with Google
        </Button>

        <Divider sx={{ width: "100%", mb: 3 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
            OR WITH EMAIL
          </Typography>
        </Divider>

        <Box
          component="form"
          onSubmit={handleCredentialsSubmit}
          sx={{ width: "100%" }}
        >
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

          {error && (
            <Alert severity="error" sx={{ mt: 2, borderRadius: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            type="submit"
            fullWidth
            variant="contained"
            disabled={loading}
            sx={{
              mt: 4,
              py: 1.5,
              borderRadius: 3,
              textTransform: "none",
              fontSize: "1rem",
              fontWeight: "bold",
            }}
          >
            {loading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "Sign In"
            )}
          </Button>

          <Box sx={{ mt: 3, textAlign: "center" }}>
            <Typography variant="body2" color="text.secondary">
              Do not have an account?{" "}
              <Link
                component="button"
                variant="body2"
                onClick={() => router.push("/auth/signUp")}
                sx={{ fontWeight: "bold", textDecoration: "none" }}
              >
                Sign Up
              </Link>
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
}
