"use client";

import { useState } from "react";
import { Box, Switch, TextField, Typography } from "@mui/material";
import { useTranslations } from "next-intl";
import {
  CATEGORY_NAME_MAX,
  createMenuCategorySchema,
} from "@/app/lib/schemas/menu_menuCategorySchema";
import CharacterCount from "../CharacterCount";

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
  nameMy,
  onNameMyChange,
  isEnabled,
  onEnabledChange,
}: {
  name: string;
  onNameChange: (name: string) => void;
  /** Shown to customers who choose Myanmar; empty → the English name. */
  nameMy: string;
  onNameMyChange: (nameMy: string) => void;
  isEnabled: boolean;
  onEnabledChange: (isEnabled: boolean) => void;
}) {
  const t = useTranslations("bo.categoryFields");
  const tCommon = useTranslations("bo.common");
  const [isTouched, setIsTouched] = useState(false);
  // The rule is the schema's; the words are the staff's language.
  const nameError =
    isTouched && categoryNameError(name)
      ? name.trim() === ""
        ? t("nameRequired")
        : t("nameTooLong")
      : null;

  return (
    <>
      <TextField
        label={t("name")}
        required
        autoFocus
        fullWidth
        value={name}
        onChange={(event) => onNameChange(event.target.value)}
        onBlur={() => setIsTouched(true)}
        error={nameError !== null}
        helperText={
          nameError ?? <CharacterCount count={name.length} max={CATEGORY_NAME_MAX} />
        }
        slotProps={{ htmlInput: { maxLength: CATEGORY_NAME_MAX } }}
        sx={{ mb: 1 }}
      />
      <TextField
        label={tCommon("myanmarName")}
        fullWidth
        value={nameMy}
        onChange={(event) => onNameMyChange(event.target.value)}
        helperText={
          <CharacterCount
            count={nameMy.length}
            max={CATEGORY_NAME_MAX}
            hint={tCommon("myanmarHelper")}
          />
        }
        slotProps={{
          htmlInput: { maxLength: CATEGORY_NAME_MAX, lang: "my" },
          formHelperText: { component: "div" },
        }}
        sx={{ mb: 2 }}
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
          <Typography variant="body2">{t("showHere")}</Typography>
          <Typography variant="caption" color="text.secondary">
            {isEnabled ? t("shownHint") : t("hiddenHint")}
          </Typography>
        </Box>
        <Switch
          checked={isEnabled}
          onChange={(event) => onEnabledChange(event.target.checked)}
          slotProps={{
            input: { "aria-label": t("showHereLabel") },
          }}
        />
      </Box>
    </>
  );
}
