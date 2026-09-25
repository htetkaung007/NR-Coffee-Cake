"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { updateMenuCategoryAction } from "../backoffice/menu_categories/action";

export interface EditableMenuCategory {
  id: number;
  name: string;
  isEnabledAtLocation: boolean;
}

interface EditMenuCategoryDialogProps {
  open: boolean;
  category: EditableMenuCategory | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function EditMenuCategoryDialog({
  open,
  category,
  onClose,
  onSaved,
}: EditMenuCategoryDialogProps) {
  const [name, setName] = useState(category?.name ?? "");
  const [isEnabled, setIsEnabled] = useState(
    category?.isEnabledAtLocation ?? true,
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [prevCategoryId, setPrevCategoryId] = useState(category?.id ?? null);

  // Re-seed the form fields whenever the dialog is opened for a
  // (possibly different) category — adjusting state during render, per
  // React's documented pattern, instead of an effect.
  if (category && category.id !== prevCategoryId) {
    setPrevCategoryId(category.id);
    setName(category.name);
    setIsEnabled(category.isEnabledAtLocation);
    setError(null);
  }

  async function handleSave() {
    if (!category) return;
    setError(null);
    setIsSaving(true);

    const result = await updateMenuCategoryAction(category.id, {
      name,
      isEnabled,
    });

    setIsSaving(false);

    if (!result.success) {
      setError(result.error.message);
      return;
    }

    onSaved();
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        Edit Menu Category
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <TextField
          label="Category Name"
          required
          autoFocus
          fullWidth
          value={name}
          onChange={(event) => setName(event.target.value)}
          sx={{ mb: 2.5 }}
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
            onChange={(event) => setIsEnabled(event.target.checked)}
            slotProps={{
              input: { "aria-label": "Show category at this location" },
            }}
          />
        </Box>
      </DialogContent>

      <Stack
        direction="row"
        spacing={1.5}
        sx={{ justifyContent: "flex-end", p: 2 }}
      >
        <Button variant="outlined" color="inherit" onClick={onClose}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isSaving || !name.trim()}
        >
          {isSaving ? "Saving..." : "Save Changes"}
        </Button>
      </Stack>
    </Dialog>
  );
}
