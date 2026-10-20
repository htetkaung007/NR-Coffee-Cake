"use client";

import { useTranslations } from "next-intl";
import { useStaffErrorMessage } from "@/app/lib/hooks/useStaffWords";
import { useState, useTransition } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  DEFAULT_MANAGER_PERMISSIONS,
  type PermissionKey,
} from "@/app/lib/access/permissions";
import PermissionChecklist from "./PermissionChecklist";
import { createManagerAction } from "./action";

interface LocationOption {
  id: number;
  name: string;
}

interface AddManagerFormProps {
  locations: LocationOption[];
}

export default function AddManagerForm({ locations }: AddManagerFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [locationId, setLocationId] = useState("");
  const [permissions, setPermissions] = useState<PermissionKey[]>([
    ...DEFAULT_MANAGER_PERMISSIONS,
  ]);
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const t = useTranslations("bo.settings");
  const errorText = useStaffErrorMessage();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createManagerAction({
        email,
        password,
        locationId: Number(locationId),
        permissions,
      });
      if (!result.success) {
        setError(errorText(result.error));
        return;
      }

      setShowSuccess(true);
      setEmail("");
      setPassword("");
      setLocationId("");
      setPermissions([...DEFAULT_MANAGER_PERMISSIONS]);
    });
  }

  return (
    <>
      {/* Sits inside the Settings page's "Managers" card, which carries
         the heading and description. */}
      <Box component="form" onSubmit={handleSubmit} sx={{ maxWidth: 480 }}>
        <Stack spacing={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          {locations.length === 0 && (
            <Alert severity="warning">
              {t("noLocationsYet")}
            </Alert>
          )}

          <TextField
            label={t("managerEmail")}
            type="email"
            required
            fullWidth
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <TextField
            label={t("password")}
            type="password"
            required
            fullWidth
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            helperText={t("passwordHint")}
          />

          <TextField
            select
            label={t("location")}
            required
            fullWidth
            value={locationId}
            onChange={(event) => setLocationId(event.target.value)}
          >
            {locations.map((location) => (
              <MenuItem key={location.id} value={location.id}>
                {location.name}
              </MenuItem>
            ))}
          </TextField>

          <Box>
            <Typography variant="subtitle2" component="h3" sx={{ mb: 1 }}>
              {t("whatCanDo")}
            </Typography>
            <PermissionChecklist
              value={permissions}
              onChange={setPermissions}
              disabled={isPending}
            />
          </Box>

          <Button
            type="submit"
            variant="contained"
            disabled={isPending || locations.length === 0}
            sx={{ alignSelf: "flex-start", px: 3 }}
          >
            {isPending ? t("adding") : t("addManager")}
          </Button>
        </Stack>
      </Box>

      <Snackbar
        open={showSuccess}
        autoHideDuration={2000}
        onClose={() => setShowSuccess(false)}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
      >
        <Alert severity="success" variant="filled" sx={{ width: "100%" }}>
          {t("managerCreated")}
        </Alert>
      </Snackbar>
    </>
  );
}
