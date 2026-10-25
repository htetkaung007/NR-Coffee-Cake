"use client";

import { useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  useMediaQuery,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import CloseIcon from "@mui/icons-material/Close";
import { createMenuCategoryAction } from "@/app/backoffice/menu_categories/action";
import { useTranslations } from "next-intl";
import { useStaffErrorMessage, useStaffGenericError } from "@/app/lib/hooks/useStaffWords";
import { useSubmitLock } from "@/app/lib/hooks/useSubmitLock";
import SubmitButton from "@/app/components/SubmitButton";
import MenuCategoryFields, { categoryNameError } from "./MenuCategoryFields";

export interface CreatedMenuCategory {
  id: number;
  name: string;
  nameMy?: string | null;
}

/**
 * Create a menu category without leaving the page — from the categories
 * page and from the menu form (createMenuCategoryAction, owner-only).
 * On success it hands the new { id, name } to `onCreated` and closes; the
 * caller shows the snackbar. An error (e.g. a duplicate name) shows
 * inline and keeps what was typed. Full-screen on phones; the page
 * underneath is never navigated or reset.
 */
export default function CreateMenuCategoryDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (category: CreatedMenuCategory) => void;
}) {
  const t = useTranslations("bo.categoryFields");
  const tCommon = useTranslations("bo.common");
  const errorText = useStaffErrorMessage();
  const genericError = useStaffGenericError();
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const [name, setName] = useState("");
  const [nameMy, setNameMy] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const submitLock = useSubmitLock();

  // Start blank each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      // The last create's lock (kept while the dialog closed) opens again.
      submitLock.unlock();
      setName("");
      setNameMy("");
      setIsEnabled(true);
      setError(null);
    }
  }

  function handleCreate(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (categoryNameError(name)) return;
    void submitLock.run(async () => {
      setError(null);
      const result = await createMenuCategoryAction({ name, nameMy, isEnabled });
      if (!result.success) {
        setError(errorText(result.error));
        return;
      }
      // "Created ✓" (disabled) while the dialog closes.
      submitLock.keepLocked();
      onCreated({ id: result.data.id, name: result.data.name, nameMy: nameMy || null });
      onClose();
    }, () => setError(genericError));
  }
  const isSaving = submitLock.status === "busy";

  return (
    <Dialog
      open={open}
      onClose={isSaving ? undefined : onClose}
      fullScreen={isPhone}
      maxWidth="xs"
      fullWidth
      aria-labelledby="create-category-title"
      slotProps={{ paper: { component: "form", onSubmit: handleCreate } }}
    >
      <DialogTitle
        id="create-category-title"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {t("newTitle")}
        <IconButton
          onClick={onClose}
          aria-label={tCommon("close")}
          sx={{ width: 44, height: 44 }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        <MenuCategoryFields
          name={name}
          onNameChange={setName}
          nameMy={nameMy}
          onNameMyChange={setNameMy}
          isEnabled={isEnabled}
          onEnabledChange={setIsEnabled}
        />
      </DialogContent>

      <Stack
        direction="row"
        spacing={1.5}
        sx={{
          justifyContent: "flex-end",
          p: 2,
          pb: isPhone ? "calc(16px + env(safe-area-inset-bottom, 0px))" : 2,
        }}
      >
        <Button variant="outlined" color="inherit" onClick={onClose}>
          {tCommon("cancel")}
        </Button>
        <SubmitButton
          type="submit"
          variant="contained"
          status={submitLock.status}
          busyLabel={t("creating")}
          doneLabel={tCommon("created")}
          disabled={!name.trim()}
        >
          {t("create")}
        </SubmitButton>
      </Stack>
    </Dialog>
  );
}
