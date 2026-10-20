"use client";

import CenteredPage from "@/app/components/CenteredPage";
import { useState } from "react";
import {
  Box,
  Button,
  FormControlLabel,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import PointOfSaleOutlinedIcon from "@mui/icons-material/PointOfSaleOutlined";
import UploadOutlinedIcon from "@mui/icons-material/UploadOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import FormCard, { SuccessSnackbar } from "@/app/components/FormCard";
import PageHeader from "@/app/components/PageHeader";
import { useSaveThenNavigate } from "@/app/lib/hooks/useSaveThenNavigate";
import { useTranslations } from "next-intl";
import { createTableAction } from "../action";

/** The Counter's stored name (shop data — the same in every language;
 *  TableService sets it). */
const COUNTER_NAME = "Counter QR code";

export default function NewTable() {
  const t = useTranslations("bo.tables");
  const tCommon = useTranslations("bo.common");
  const { error, setError, isPending, showSuccess, closeSuccess, save } =
    useSaveThenNavigate();
  const [name, setName] = useState("");
  const [isCounter, setIsCounter] = useState(false);
  const [logo, setLogo] = useState<File | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("isCounter", String(isCounter));
    if (logo) formData.set("logo", logo);

    save(() => createTableAction(formData), "/backoffice/tables");
  }

  return (
    <>
      <CenteredPage>
        <PageHeader
          title={t("newTable")}
          backHref="/backoffice/tables"
          backLabel={t("backToTables")}
        />
        <FormCard onSubmit={handleSubmit} error={error}>
          {/* Prominent on purpose (own bordered box, filled icon,
                bold label) — this single switch changes what the rest
                of the form means (name becomes fixed/disabled), so it
                needs to be seen before the Name field, not blend in
                with the other options below it. */}
          <Box
            sx={{
              border: "1px solid",
              borderColor: isCounter ? "primary.main" : "divider",
              borderRadius: 2,
              p: 1.5,
              bgcolor: isCounter ? "primary.50" : "transparent",
              transition: "border-color 0.15s, background-color 0.15s",
            }}
          >
            <FormControlLabel
              control={
                <Switch
                  checked={isCounter}
                  onChange={(event) => setIsCounter(event.target.checked)}
                />
              }
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
                  <PointOfSaleOutlinedIcon
                    fontSize="small"
                    color={isCounter ? "primary" : "action"}
                  />
                  <Typography sx={{ fontWeight: 700 }}>{t("counterSwitch")}</Typography>
                </Box>
              }
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ display: "block", ml: 5.5 }}
            >
              {isCounter ? t("counterOn", { name: COUNTER_NAME }) : t("counterOff")}
            </Typography>
          </Box>

          <TextField
            label={t("tableName")}
            required={!isCounter}
            autoFocus
            fullWidth
            disabled={isCounter}
            value={isCounter ? COUNTER_NAME : name}
            onChange={(event) => setName(event.target.value)}
            helperText={
              isCounter ? t("nameLocked") : t("nameHint")
            }
          />

          <Box>
            <Button
              component="label"
              variant="outlined"
              startIcon={<UploadOutlinedIcon />}
            >
              {logo ? tCommon("changeLogo") : t("uploadLogo")}
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
                {t("logoHint")}
              </Typography>
            )}
          </Box>

          <Button
            type="submit"
            variant="contained"
            disabled={isPending || (!isCounter && !name.trim())}
            sx={{ alignSelf: "flex-start", px: 3 }}
          >
            {isPending ? tCommon("creating") : t("createTable")}
          </Button>
        </FormCard>
      </CenteredPage>

      <SuccessSnackbar
        open={showSuccess}
        onClose={closeSuccess}
        message={t("created")}
      />
    </>
  );
}
