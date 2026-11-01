"use client";

import { TextField } from "@mui/material";
import { useTranslations } from "next-intl";
import PasswordField from "@/app/components/PasswordField";

/** The email + password fields of the sign-in and sign-up forms. */
export default function AuthCredentialFields({
  email,
  onEmailChange,
  password,
  onPasswordChange,
  passwordAutoComplete,
}: {
  email: string;
  onEmailChange: (value: string) => void;
  password: string;
  onPasswordChange: (value: string) => void;
  passwordAutoComplete: "current-password" | "new-password";
}) {
  const t = useTranslations("bo.auth");
  return (
    <>
      <TextField
        fullWidth
        label={t("email")}
        type="email"
        variant="outlined"
        margin="normal"
        required
        value={email}
        onChange={(e) => onEmailChange(e.target.value)}
      />
      <PasswordField
        fullWidth
        label={t("password")}
        autoComplete={passwordAutoComplete}
        variant="outlined"
        margin="normal"
        required
        value={password}
        onChange={(e) => onPasswordChange(e.target.value)}
      />
    </>
  );
}
