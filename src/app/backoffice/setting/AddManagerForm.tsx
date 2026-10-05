"use client";

import { useState, useTransition } from "react";
import {
  Alert,
  Box,
  Button,
  MenuItem,
  Snackbar,
  Stack,
  TextField,
} from "@mui/material";
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
  const [error, setError] = useState<string | null>(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const formData = new FormData();
    formData.set("email", email);
    formData.set("password", password);
    formData.set("locationId", locationId);

    startTransition(async () => {
      const result = await createManagerAction(formData);
      if (!result.success) {
        setError(result.error.message);
        return;
      }

      setShowSuccess(true);
      setEmail("");
      setPassword("");
      setLocationId("");
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
              Create a location first before adding a Manager.
            </Alert>
          )}

          <TextField
            label="Manager Email"
            type="email"
            required
            fullWidth
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />

          <TextField
            label="Password"
            type="password"
            required
            fullWidth
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            helperText="At least 8 characters."
          />

          <TextField
            select
            label="Location"
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

          <Button
            type="submit"
            variant="contained"
            disabled={isPending || locations.length === 0}
            sx={{ alignSelf: "flex-start", px: 3 }}
          >
            {isPending ? "Adding..." : "Add Manager"}
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
          Manager account created!
        </Alert>
      </Snackbar>
    </>
  );
}
