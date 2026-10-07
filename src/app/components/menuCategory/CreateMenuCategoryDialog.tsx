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
import MenuCategoryFields, { categoryNameError } from "./MenuCategoryFields";

export interface CreatedMenuCategory {
  id: number;
  name: string;
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
  const theme = useTheme();
  const isPhone = useMediaQuery(theme.breakpoints.down("sm"));
  const [name, setName] = useState("");
  const [isEnabled, setIsEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Start blank each time it opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setName("");
      setIsEnabled(true);
      setError(null);
    }
  }

  async function handleCreate(event: { preventDefault: () => void }) {
    event.preventDefault();
    if (categoryNameError(name)) return;
    setError(null);
    setIsSaving(true);
    const result = await createMenuCategoryAction({ name, isEnabled });
    setIsSaving(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }
    onCreated({ id: result.data.id, name: result.data.name });
    onClose();
  }

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
        New Menu Category
        <IconButton
          onClick={onClose}
          aria-label="Close"
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
          Cancel
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSaving || !name.trim()}
        >
          {isSaving ? "Creating..." : "Create Category"}
        </Button>
      </Stack>
    </Dialog>
  );
}
