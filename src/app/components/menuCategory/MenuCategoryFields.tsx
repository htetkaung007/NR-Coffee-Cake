"use client";

import { useState } from "react";
import { Box, Switch, TextField, Typography } from "@mui/material";
import { createMenuCategorySchema } from "@/app/lib/schemas/menu_menuCategorySchema";

/** The name rule the Server Actions use — checked here on blur. */
const nameRule = createMenuCategorySchema.shape.name;

/** Empty when the name is fine, else the schema's message. */
export function categoryNameError(name: string): string | null {
  const result = nameRule.safeParse(name);
  return result.success ? null : (result.error.issues[0]?.message ?? null);
}

/**
 * A category's own fields — name + "Show at this location" — shared by
 * the Create and Edit category dialogs, so they look and validate the
 * same (the name is checked on blur with the actions' Zod rule).
 */
export default function MenuCategoryFields({
  name,
  onNameChange,
  isEnabled,
  onEnabledChange,
}: {
  name: string;
  onNameChange: (name: string) => void;
  isEnabled: boolean;
  onEnabledChange: (isEnabled: boolean) => void;
}) {
  const [isTouched, setIsTouched] = useState(false);
  const nameError = isTouched ? categoryNameError(name) : null;

  return (
    <>
      <TextField
        label="Category Name"
        required
        autoFocus
        fullWidth
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        onBlur={() => setIsTouched(true)}
        error={nameError !== null}
        helperText={nameError ?? " "}
        slotProps={{ htmlInput: { maxLength: 50 } }}
        sx={{ mb: 1 }}
      />

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 2,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          p: 1.5,
        }}
      >
        <Box>
          <Typography variant="body2">Show at this location</Typography>
          <Typography variant="caption" color="text.secondary">
            {isEnabled
              ? "Customers at this location see this category."
              : "Hidden from customers at this location."}
          </Typography>
        </Box>
        <Switch
          checked={isEnabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          slotProps={{
            input: { "aria-label": "Show category at this location" },
          }}
        />
      </Box>
    </>
  );
}
