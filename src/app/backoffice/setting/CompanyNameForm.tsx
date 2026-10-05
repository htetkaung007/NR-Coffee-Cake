"use client";

import { useState, useTransition } from "react";
import { Alert, Box, Button, Snackbar, TextField } from "@mui/material";
import { companyNameSchema } from "@/app/lib/schemas/companyNameSchema";
import { updateCompanyNameAction } from "./action";

const HELPER_TEXT =
  "Shown in the Backoffice top bar. Customers see your location name instead.";

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

  const parsed = companyNameSchema.safeParse(value);
  const schemaError = parsed.success ? null : parsed.error.issues[0]?.message;
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
        setServerError(result.error.message);
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
          label="Company name"
          name="name"
          fullWidth
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
          helperText={fieldError ?? HELPER_TEXT}
          disabled={isPending}
        />
        <Button
          type="submit"
          variant="contained"
          disabled={!canSave}
          // Phones: its own line; sm+: as tall as the field beside it.
          sx={{ minHeight: { xs: 44, sm: 56 }, flexShrink: 0, alignSelf: "flex-start" }}
        >
          {isPending ? "Saving..." : "Save"}
        </Button>
      </Box>

      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          Company name updated
        </Alert>
      </Snackbar>
    </>
  );
}
