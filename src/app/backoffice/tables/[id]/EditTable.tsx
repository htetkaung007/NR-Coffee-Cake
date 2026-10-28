"use client";

import CenteredPage from "@/app/components/CenteredPage";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  CardMedia,
  TextField,
  Typography,
} from "@mui/material";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import DownloadOutlinedIcon from "@mui/icons-material/DownloadOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { updateTableAction, deleteTableAction } from "../action";
import FormCard from "@/app/components/FormCard";
import PageHeader from "@/app/components/PageHeader";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { downloadQrCode } from "@/app/lib/qr/downloadQrCode";
import DangerZone from "@/app/components/DangerZone";
import { useTranslations } from "next-intl";
import { useStaffErrorMessage } from "@/app/lib/hooks/useStaffWords";

interface EditTableProps {
  table: {
    id: number;
    name: string;
    qrImageUrl: string | null;
    isArchived: boolean;
  };
}

export default function EditTable({ table }: EditTableProps) {
  const router = useRouter();
  const t = useTranslations("bo.tables");
  const tCommon = useTranslations("bo.common");
  const errorText = useStaffErrorMessage();
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
        setNameError(errorText(result.error));
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
        setDeleteError(errorText(result.error));
        setDeleteDialogOpen(false);
        return;
      }
      router.push("/backoffice/tables");
    });
  }

  return (
    <CenteredPage>
      <PageHeader
        title={t("editTitle")}
        backHref="/backoffice/tables"
        backLabel={t("backToTables")}
      />

      {/* Rename + logo — one form, one submit, one error. Saving with
          a new logo regenerates the QR code image (see action.ts);
          content/URL stays the same either way. */}
      <FormCard
        onSubmit={handleSaveName}
        error={nameError}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <TextField
          label={t("tableName")}
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
            {logo ? tCommon("changeLogo") : t("updateLogo")}
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
                {tCommon("imageChosen", { name: logo.name })}
              </Typography>
            </Box>
          ) : (
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mt: 0.5 }}
            >
              {t("updateLogoHint")}
            </Typography>
          )}
        </Box>

        {table.qrImageUrl && (
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", mb: 0.5 }}
            >
              {t("currentQr")}
            </Typography>
            <CardMedia
              component="img"
              image={table.qrImageUrl}
              alt={t("qrAlt", { name: table.name })}
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
                table.qrImageUrl &&
                downloadQrCode(table.qrImageUrl, table.name)
              }
              sx={{ fontSize: "0.75rem" }}
            >
              {t("saveQr")}
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
            {isSavingName ? tCommon("saving") : tCommon("saveChanges")}
          </Button>
          <Button
            type="button"
            variant="outlined"
            disabled={isSavingName}
            onClick={() => router.push("/backoffice/tables")}
          >
            {tCommon("cancel")}
          </Button>
        </Box>
      </FormCard>

      {/* Delete — immediate hard delete, no archive step. Removes the
          Table row and its stored QR code image together. */}
      <DangerZone title={t("deleteTitle")} error={deleteError}>
        <Typography variant="caption" color="text.secondary">
          {t("deleteHint")}
        </Typography>
        <Box sx={{ mt: 1.5 }}>
          <Button
            variant="outlined"
            color="error"
            disabled={isDeleting}
            onClick={() => setDeleteDialogOpen(true)}
          >
            {t("deleteTitle")}
          </Button>
        </Box>
      </DangerZone>

      <ConfirmDialog
        open={deleteDialogOpen}
        title={t("deleteConfirmTitle")}
        message={t("deleteConfirmMessage")}
        confirmLabel={tCommon("yesDelete")}
        pendingLabel={tCommon("deleting")}
        cancelLabel={tCommon("cancel")}
        destructive
        pending={isDeleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteDialogOpen(false)}
      />
    </CenteredPage>
  );
}
