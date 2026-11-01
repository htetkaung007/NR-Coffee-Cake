"use client";

import { useEffect, useRef, useState } from "react";
import { IconButton, InputAdornment, TextField } from "@mui/material";
import type { TextFieldProps } from "@mui/material";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { useTranslations } from "next-intl";

/**
 * Every password field (staff surface only: sign-in, sign-up, Add a
 * manager) — a TextField with an eye button. Hidden by default, and hidden
 * again whenever its form is submitted. The look stays the theme's; the
 * autocomplete hint is required, so a password manager always knows which
 * kind of password this is.
 */
export default function PasswordField({
  autoComplete,
  ...fieldProps
}: Omit<TextFieldProps, "type" | "autoComplete" | "inputRef" | "slotProps"> & {
  autoComplete: "current-password" | "new-password";
}) {
  const t = useTranslations("bo.auth");
  const [isVisible, setIsVisible] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) return;
    const hide = () => setIsVisible(false);
    form.addEventListener("submit", hide);
    return () => form.removeEventListener("submit", hide);
  }, []);

  return (
    <TextField
      {...fieldProps}
      type={isVisible ? "text" : "password"}
      autoComplete={autoComplete}
      inputRef={inputRef}
      slotProps={{
        input: {
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                type="button"
                edge="end"
                aria-label={isVisible ? t("hidePassword") : t("showPassword")}
                aria-pressed={isVisible}
                // Keeps the focus (and the phone's keyboard) in the field.
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setIsVisible((visible) => !visible)}
                sx={{ width: 44, height: 44 }}
              >
                {isVisible ? <VisibilityOffIcon /> : <VisibilityIcon />}
              </IconButton>
            </InputAdornment>
          ),
        },
      }}
      // Edge's own reveal button would be a second eye.
      sx={[
        { "& input::-ms-reveal": { display: "none" } },
        ...(Array.isArray(fieldProps.sx) ? fieldProps.sx : [fieldProps.sx]),
      ]}
    />
  );
}
