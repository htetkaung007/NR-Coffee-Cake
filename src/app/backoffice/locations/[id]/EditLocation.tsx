"use client";

import CenteredPage from "@/app/components/CenteredPage";
import { useTranslations } from "next-intl";
import { useStaffErrorMessage } from "@/app/lib/hooks/useStaffWords";
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
  type LocationDeletion,
} from "@/app/lib/location/locationDeletion";
import {
  toggleLocationArchiveAction,
  updateLocationNameAction,
  hardDeleteLocationAction,
} from "../action";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import FormCard from "@/app/components/FormCard";
import PageHeader from "@/app/components/PageHeader";
import OnlineMenuSection from "./OnlineMenuSection";
import DangerZone from "@/app/components/DangerZone";

interface EditLocationProps {
  location: {
    id: number;
    name: string;
    isArchived: boolean;
    onlineMenuEnabled: boolean;
  };
  /** config.publicBaseUrl — the online menu link's base (may be ""). */
  publicBaseUrl: string;
  /** Display only — hardDeleteLocationAction checks the rule again. */
  deletion: LocationDeletion;
  /** Names (or emails) of the managers assigned here, when they block
   *  the delete. */
  blockingManagers: { id: number; name: string }[];
}

export default function EditLocation({
  location,
  publicBaseUrl,
  deletion,
  blockingManagers,
}: EditLocationProps) {
  const t = useTranslations("bo.locations");
  const tCommon = useTranslations("bo.common");
  const errorText = useStaffErrorMessage();
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
      if (!result.success) setNameError(errorText(result.error));
    });
  }

  function handleToggleArchive() {
    setArchiveError(null);
    const next = !isArchived;

    startTogglingArchive(async () => {
      const result = await toggleLocationArchiveAction(location.id, next);
      if (!result.success) {
        setArchiveError(errorText(result.error));
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
        setDeleteError(errorText(result.error));
        setDeleteDialogOpen(false);
        return;
      }
      router.push("/backoffice/locations");
    });
  }

  return (
    <CenteredPage>
      <PageHeader
        title={t("editTitle")}
        backHref="/backoffice/locations"
        backLabel={t("backToLocations")}
      />

      {/* Rename — its own form, its own submit, its own error */}
      <FormCard
        onSubmit={handleSaveName}
        error={nameError}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <TextField
          label={t("name")}
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
          {isSavingName ? tCommon("saving") : t("saveName")}
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
              {isArchived ? t("closed") : t("open")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {isArchived ? t("archivedHint") : t("archiveHint")}
            </Typography>
          </Box>
          <Switch
            checked={!isArchived}
            disabled={isTogglingArchive}
            onChange={handleToggleArchive}
            slotProps={{ input: { "aria-label": t("openClosed") } }}
          />
        </Box>
      </Box>

      <OnlineMenuSection
        locationId={location.id}
        enabled={location.onlineMenuEnabled}
        publicBaseUrl={publicBaseUrl}
        isArchived={isArchived}
      />

      {/* Danger zone — permanent delete (lib/location/locationDeletion): only a
          location with no sales history and no managers; right away,
          archived or not. */}
      <DangerZone
        title={t("dangerZone")}
        titleId="danger-zone-title"
        error={deleteError}
      >
        {deletion.allowed ? (
          <>
            <Typography variant="caption" color="text.secondary">
              {t("canDelete")}
            </Typography>
            <Box sx={{ mt: 1.5 }}>
              <Button
                variant="outlined"
                color="error"
                disabled={isDeleting}
                onClick={openDeleteDialog}
                sx={{ minHeight: 44 }}
              >
                {t("deletePermanently")}
              </Button>
            </Box>
          </>
        ) : deletion.reason === "hasManagers" ? (
          <>
            <Typography variant="caption" color="text.secondary" component="p">
              {t("managersAssigned")} {t("hasManagers")}
            </Typography>
            {blockingManagers.length > 0 && (
              <Box
                component="ul"
                aria-label={t("managersHere")}
                sx={{ m: 0, mt: 1, pl: 2.5 }}
              >
                {blockingManagers.map(({ id, name }) => (
                  <Typography
                    key={id}
                    component="li"
                    variant="body2"
                    sx={{ overflowWrap: "anywhere" }}
                  >
                    {name}
                  </Typography>
                ))}
              </Box>
            )}
            <Box sx={{ mt: 1.5 }}>
              <Button
                component={Link}
                href="/backoffice/setting#settings-managers"
                variant="outlined"
                sx={{ minHeight: 44 }}
              >
                {t("manageInSettings")}
              </Button>
            </Box>
          </>
        ) : (
          <Typography variant="caption" color="text.secondary" component="p">
            {t("hasSales")}
          </Typography>
        )}
      </DangerZone>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t("deleteTitle", { name: location.name })}
        message={t("deleteMessage")}
        confirmLabel={tCommon("delete")}
        pendingLabel={tCommon("deleting")}
        cancelLabel={tCommon("cancel")}
        destructive
        pending={isDeleting}
        requireTypedText={{
          text: location.name,
          label: t("nameLabel"),
          helper: tCommon("typeToConfirm", { text: location.name }),
        }}
        onConfirm={handleHardDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </CenteredPage>
  );
}
