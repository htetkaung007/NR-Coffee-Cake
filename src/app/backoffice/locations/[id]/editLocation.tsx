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
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  toggleLocationArchiveAction,
  updateLocationNameAction,
  hardDeleteLocationAction,
} from "../action";

interface EditLocationProps {
  location: {
    id: number;
    name: string;
    isArchived: boolean;
    archivedAt: string | null;
  };
  daysUntilDeletable: number;
}

export default function EditLocation({
  location,
  daysUntilDeletable,
}: EditLocationProps) {
  const router = useRouter();
  const [name, setName] = useState(location.name);
  const [isArchived, setIsArchived] = useState(location.isArchived);

  const [nameError, setNameError] = useState<string | null>(null);
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const [isSavingName, startSavingName] = useTransition();
  const [isTogglingArchive, startTogglingArchive] = useTransition();
  const [isDeleting, startDeleting] = useTransition();

  const canHardDelete = isArchived && daysUntilDeletable === 0;

  function handleSaveName(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);

    const formData = new FormData();
    formData.set("name", name);

    startSavingName(async () => {
      const result = await updateLocationNameAction(location.id, formData);
      if (!result.success) setNameError(result.error.message);
    });
  }

  function handleToggleArchive() {
    setArchiveError(null);
    const next = !isArchived;

    startTogglingArchive(async () => {
      const result = await toggleLocationArchiveAction(location.id, next);
      if (!result.success) {
        setArchiveError(result.error.message);
        return;
      }
      setIsArchived(next);
    });
  }

  function handleHardDelete() {
    setDeleteError(null);
    startDeleting(async () => {
      const result = await hardDeleteLocationAction(location.id);
      if (!result.success) {
        setDeleteError(result.error.message);
        setDeleteDialogOpen(false);
        return;
      }
      router.push("/backoffice/locations");
    });
  }

  return (
    <Box sx={{ maxWidth: 480, mx: "auto", p: { xs: 2, sm: 3, md: 4 } }}>
      <Typography variant="h6" sx={{ mb: 3 }}>
        Edit Location
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
            label="Location Name"
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

      {/* Archive toggle — separate control, separate action */}
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 3,
          p: { xs: 2, sm: 3 },
          mb: 3,
        }}
      >
        {archiveError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {archiveError}
          </Alert>
        )}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Box>
            <Typography variant="body2">
              {isArchived ? "Closed" : "Open"}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isArchived
                ? "This location is archived — reopen it to make it operational again."
                : "Archiving closes this location; it can be reopened anytime."}
            </Typography>
          </Box>
          <Switch
            checked={!isArchived}
            disabled={isTogglingArchive}
            onChange={handleToggleArchive}
            slotProps={{ input: { "aria-label": "Location open/closed" } }}
          />
        </Box>
      </Box>

      {/* Hard delete — only reachable once archived + 60 days have passed */}
      {isArchived && (
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
            Permanently Delete
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {canHardDelete
              ? "This location is eligible for permanent deletion. This cannot be undone."
              : `Available for permanent deletion in ${daysUntilDeletable} more day(s).`}
          </Typography>
          <Box sx={{ mt: 1.5 }}>
            <Button
              variant="outlined"
              color="error"
              disabled={!canHardDelete || isDeleting}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Permanently Delete
            </Button>
          </Box>
        </Box>
      )}

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>Permanently delete this location?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This removes the location and its data from the database
            permanently. This action cannot be undone. Are you sure?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={isDeleting}
            onClick={handleHardDelete}
          >
            {isDeleting ? "Deleting..." : "Yes, delete permanently"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
