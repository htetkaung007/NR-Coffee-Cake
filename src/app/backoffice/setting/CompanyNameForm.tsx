"use client";

import { useTranslations } from "next-intl";
import { useStaffErrorMessage } from "@/app/lib/hooks/useStaffWords";
import { useState, useTransition } from "react";
import { Alert, Box, Button, Snackbar, TextField } from "@mui/material";
import { companyNameSchema } from "@/app/lib/schemas/companyNameSchema";
import { updateCompanyNameAction } from "./action";


/** The company's name, edited in place. Save is enabled only for a valid
 *  name that differs from the saved one; the field's error comes from
 *  the same schema the action validates with, shown once the field has
 *  been left (or Enter pressed), then live (DESIGN.md Rule 16). */
export default function CompanyNameForm({ initialName }: { initialName: string }) {
  const [savedName, setSavedName] = useState(initialName);
  const [value, setValue] = useState(initialName);
  const [touched, setTouched] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("bo.settings");
  const tCommon = useTranslations("bo.common");
  const errorText = useStaffErrorMessage();

  const parsed = companyNameSchema.safeParse(value);
  // The schema's rule, the staff's words: empty, or too long.
  const schemaError = parsed.success
    ? null
    : value.trim() === ""
      ? t("companyNameRequired")
      : t("companyNameTooLong");
  const fieldError = serverError ?? (touched ? schemaError : null);
  const canSave = parsed.success && parsed.data !== savedName && !isPending;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTouched(true);
    if (!canSave) return;

    const formData = new FormData();
    formData.set("name", value);
    startTransition(async () => {
      const result = await updateCompanyNameAction(formData);
      if (!result.success) {
        setServerError(errorText(result.error));
        return;
      }
      setSavedName(result.data.name);
      setValue(result.data.name);
      setTouched(false);
      setShowSuccess(true);
    });
  }

  return (
    <>
      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit}
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { sm: "flex-start" },
          gap: 2,
        }}
      >
        <TextField
          label={t("companyName")}
          name="name"
          fullWidth
          // A readable field beside Save on wide screens.
          sx={{ maxWidth: { sm: 480 } }}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setServerError(null);
          }}
          onBlur={() => setTouched(true)}
          onKeyDown={(event) => {
            // Enter with an invalid name: Save is disabled, so the form
            // won't submit — show why instead.
            if (event.key === "Enter") setTouched(true);
          }}
          error={Boolean(fieldError)}
          helperText={fieldError ?? t("companyNameHelper")}
          disabled={isPending}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!canSave}
          // Phones: its own line; sm+: as tall as the field beside it.
          sx={{ minHeight: { xs: 44, sm: 56 }, flexShrink: 0, alignSelf: "flex-start" }}
        >
          {isPending ? tCommon("saving") : tCommon("save")}
        </Button>
      </Box>

      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          {t("companyUpdated")}
        </Alert>
      </Snackbar>
    </>
  );
}
