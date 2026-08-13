"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { updateTableNameAction, deleteTableAction } from "../action";

interface EditTableProps {
  table: {
    id: number;
    name: string;
    qrcodeImageUrl: string | null;
    isArchived: boolean;
  };
}

export default function EditTable({ table }: EditTableProps) {
  const router = useRouter();
  const [name, setName] = useState(table.name);

  const [nameError, setNameError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [isSavingName, startSavingName] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  function handleSaveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);

    const formData = new FormData();
    formData.set("name", name);

    startSavingName(async () => {
      const result = await updateTableNameAction(table.id, formData);
      if (!result.success) setNameError(result.error.message);
    });
  }

  function handleDelete() {
    setDeleteError(null);
    startDeleting(async () => {
      const result = await deleteTableAction(table.id);
      if (!result.success) {
        setDeleteError(result.error.message);
        setDeleteDialogOpen(false);
        return;
      }
      router.push("/backoffice/tables");
    });
  }

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", p: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Edit Table
      </Typography>

      {/* Rename — its own form, its own submit, its own error */}
      <Box
        component="form"
        onSubmit={handleSaveName}
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
          mb: 3,
        }}
      >
        <Stack spacing={2}>
          {nameError && <Alert severity="error">{nameError}</Alert>}
          <TextField
            label="Table Name"
            required
            fullWidth
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={isSavingName || !name.trim()}
            sx={{ alignSelf: "flex-start", px: 3 }}
          >
            {isSavingName ? "Saving..." : "Save Name"}
          </Button>
        </Stack>
      </Box>

      {/* Delete — immediate hard delete, no archive step. Removes the
          Table row and its QR code image (MinIO) together. */}
      <Box
        sx={{
          border: "1px solid",
          borderColor: "error.main",
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
        }}
      >
        {deleteError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {deleteError}
          </Alert>
        )}
        <Typography variant="body2" sx={{ mb: 0.5 }}>
          Delete Table
        </Typography>
        <Typography variant="caption" color="text.secondary">
          Removes this table and its QR code permanently. This cannot be undone.
        </Typography>
        <Box sx={{ mt: 1.5 }}>
          <Button
            variant="outlined"
            color="error"
            disabled={isDeleting}
            onClick={() => setDeleteDialogOpen(true)}
          >
            Delete Table
          </Button>
        </Box>
      </Box>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Delete this table?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure want to delete this table? This removes the table and
            its QR code from the database and storage permanently. This action
            cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={isDeleting}
            onClick={handleDelete}
          >
            {isDeleting ? "Deleting..." : "Yes, delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
