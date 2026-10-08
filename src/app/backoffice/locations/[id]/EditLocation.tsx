"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  LOCATION_DELETION_MESSAGES,
  type LocationDeletion,
} from "@/app/lib/location/locationDeletion";
import {
  toggleLocationArchiveAction,
  updateLocationNameAction,
  hardDeleteLocationAction,
} from "../action";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import FormCard from "@/app/components/FormCard";

interface EditLocationProps {
  location: {
    id: number;
    name: string;
    isArchived: boolean;
  };
  /** Display only — hardDeleteLocationAction checks the rule again. */
  deletion: LocationDeletion;
}

export default function EditLocation({
  location,
  deletion,
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

  function openDeleteDialog() {
    setDeleteDialogOpen(true);
  }

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
      <FormCard
        onSubmit={handleSaveName}
        error={nameError}
        spacing={2}
        sx={{ mb: 3 }}
      >
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
      </FormCard>

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

      {/* Danger zone — permanent delete (lib/location/locationDeletion): only a
          location with no sales history and no managers; right away,
          archived or not. */}
      <Box
        component="section"
        aria-labelledby="danger-zone-title"
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
        <Typography variant="body2" id="danger-zone-title" sx={{ mb: 0.5 }}>
          Danger zone
        </Typography>
        {deletion.allowed ? (
          <>
            <Typography variant="caption" color="text.secondary">
              No sales here yet, so this location can be deleted — with its
              tables, QR codes and stock. This can&apos;t be undone.
            </Typography>
            <Box sx={{ mt: 1.5 }}>
              <Button
                variant="outlined"
                color="error"
                disabled={isDeleting}
                onClick={openDeleteDialog}
                sx={{ minHeight: 44 }}
              >
                Delete location permanently
              </Button>
            </Box>
          </>
        ) : (
          <Typography variant="caption" color="text.secondary" component="p">
            {deletion.reason === "hasManagers" ? (
              <>
                Managers are assigned to this location.{" "}
                {LOCATION_DELETION_MESSAGES.hasManagers}{" "}
                <Link href="/backoffice/setting#settings-managers">
                  Settings → Managers
                </Link>
              </>
            ) : (
              LOCATION_DELETION_MESSAGES.hasSales
            )}
          </Typography>
        )}
      </Box>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={`Delete ${location.name} permanently?`}
        message="This removes the location with its tables, their QR codes and its stock. It can't be undone. Type the location's name to confirm."
        confirmLabel="Delete"
        pendingLabel="Deleting..."
        destructive
        pending={isDeleting}
        requireTypedText={{ text: location.name, label: "Location name" }}
        onConfirm={handleHardDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </Box>
  );
}
