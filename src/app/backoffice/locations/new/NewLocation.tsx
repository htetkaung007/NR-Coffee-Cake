"use client";

import CenteredPage from "@/app/components/CenteredPage";
import { useState } from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from "@mui/material";
import FormCard, { SuccessSnackbar } from "@/app/components/FormCard";
import SubmitButton from "@/app/components/SubmitButton";
import PageHeader from "@/app/components/PageHeader";
import { useSaveThenNavigate } from "@/app/lib/hooks/useSaveThenNavigate";
import { useTranslations } from "next-intl";
import { createLocationAction } from "../action";

type StartingMenus = "ALL" | "EMPTY";

/** The new location's starting menus — required (ALL by default); the
 *  words are bo.locations.<label> / <helper>. */
const STARTING_MENU_OPTIONS = [
  { value: "ALL", label: "startAll", helper: "startAllHint" },
  { value: "EMPTY", label: "startEmpty", helper: "startEmptyHint" },
] as const satisfies readonly { value: StartingMenus; label: string; helper: string }[];

export default function NewLocation() {
  const t = useTranslations("bo.locations");
  const tCommon = useTranslations("bo.common");
  const { error, setError, status, showSuccess, closeSuccess, save } =
    useSaveThenNavigate();
  const [name, setName] = useState("");
  const [startingMenus, setStartingMenus] = useState<StartingMenus>("ALL");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("name", name);
    formData.set("startingMenus", startingMenus);

    save(() => createLocationAction(formData), "/backoffice/locations");
  }

  return (
    <>
      <CenteredPage>
        <PageHeader
          title={t("newLocation")}
          backHref="/backoffice/locations"
          backLabel={t("backToLocations")}
        />
        <FormCard onSubmit={handleSubmit} error={error}>
          <TextField
            label={t("name")}
            required
            autoFocus
            fullWidth
            value={name}
            onChange={(event) => setName(event.target.value)}
          />

          <FormControl component="fieldset" required>
            <FormLabel component="legend">{t("startingMenus")}</FormLabel>
            <RadioGroup
              name="startingMenus"
              value={startingMenus}
              onChange={(event) =>
                setStartingMenus(event.target.value as StartingMenus)
              }
            >
              {STARTING_MENU_OPTIONS.map((option) => (
                <FormControlLabel
                  key={option.value}
                  value={option.value}
                  control={<Radio />}
                  sx={{ alignItems: "flex-start", mr: 0, mt: 1 }}
                  label={
                    <Box sx={{ pt: 1 }}>
                      <Typography variant="body2">{t(option.label)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {t(option.helper)}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>
          </FormControl>

          <SubmitButton
            type="submit"
            variant="contained"
            status={status}
            busyLabel={t("creating")}
            doneLabel={tCommon("created")}
            disabled={!name.trim()}
            sx={{ alignSelf: "flex-start", px: 3 }}
          >
            {t("create")}
          </SubmitButton>
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
