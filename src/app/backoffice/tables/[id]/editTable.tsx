"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CardMedia,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { updateTableAction, deleteTableAction } from "../action";
import { downloadQrCode } from "@/app/lib/qr/downloadQrCode";

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
  const [logo, setLogo] = useState<File | null>(null);

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
    if (logo) formData.set("logo", logo);

    startSavingName(async () => {
      const result = await updateTableAction(table.id, formData);
      if (!result.success) {
        setNameError(result.error.message);
        return;
      }
      setLogo(null); // clear the picker; router.refresh below shows the new QR
      router.refresh();
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

      {/* Rename + logo — one form, one submit, one error. Saving with
          a new logo regenerates the QR code image (see action.ts);
          content/URL stays the same either way. */}
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

          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadOutlinedIcon />}
              sx={{ fontSize: "0.8rem" }}
            >
              {logo ? "Change Logo" : "Update New Logo"}
              <input
                type="file"
                hidden
                accept="image/png,image/jpeg,image/webp"
                onChange={(event) => setLogo(event.target.files?.[0] ?? null)}
              />
            </Button>

            {logo ? (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.5,
                  mt: 0.5,
                  color: "success.main",
                }}
              >
                <CheckCircleIcon sx={{ fontSize: 16 }} />
                <Typography variant="caption">
                  Image uploaded — {logo.name}
                </Typography>
              </Box>
            ) : (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 0.5 }}
              >
                Uploading a new logo regenerates the QR code image — reprint it
                afterward to show the new logo. PNG, JPEG, or WEBP, up to 5MB.
              </Typography>
            )}
          </Box>

          {table.qrcodeImageUrl && (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mb: 0.5 }}
              >
                Current QR code
              </Typography>
              <CardMedia
                component="img"
                image={table.qrcodeImageUrl}
                alt={`QR code for ${table.name}`}
                sx={{
                  width: 120,
                  height: 120,
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 1.5,
                  mb: 1,
                }}
              />
              <Button
                size="small"
                variant="outlined"
                startIcon={<DownloadOutlinedIcon sx={{ fontSize: 14 }} />}
                onClick={() =>
                  table.qrcodeImageUrl &&
                  downloadQrCode(table.qrcodeImageUrl, table.name)
                }
                sx={{ fontSize: "0.75rem" }}
              >
                Save QR
              </Button>
            </Box>
          )}

          <Box sx={{ display: "flex", gap: 1.5 }}>
            <Button
              type="submit"
              variant="contained"
              disabled={isSavingName || !name.trim()}
              sx={{ px: 3 }}
            >
              {isSavingName ? "Saving..." : "Save Changes"}
            </Button>
            <Button
              type="button"
              variant="outlined"
              disabled={isSavingName}
              onClick={() => router.push("/backoffice/tables")}
            >
              Cancel
            </Button>
          </Box>
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
