"use client";

import { TextField } from "@mui/material";

/** The email + password fields of the sign-in and sign-up forms. */
export default function AuthCredentialFields({
  email,
  onEmailChange,
  password,
  onPasswordChange,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
}) {
  return (
    <>
      <TextField
        fullWidth
        label="Email Address"
        type="email"
        variant="outlined"
        margin="normal"
        required
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
      />
      <TextField
        fullWidth
        label="Password"
        type="password"
        variant="outlined"
        margin="normal"
        required
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
      />
    </>
  );
}
